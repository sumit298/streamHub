const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const prometheus = require("prom-client");
const morgan = require("morgan");
const https = require("https");
const fs = require("fs");
const os = require("os");

// Auto-detect local IP in development if not set
if (!process.env.ANNOUNCED_IP && process.env.NODE_ENV === "development") {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        process.env.ANNOUNCED_IP = net.address;
        console.log(`🌐 Auto-detected ANNOUNCED_IP: ${net.address}`);
        break;
      }
    }
    if (process.env.ANNOUNCED_IP) break;
  }
}

const MediaService = require("./src/services/MediaService");
const MessageQueue = require("./src/services/MessageQueue");
const CacheService = require("./src/services/CacheService");
const StreamService = require("./src/services/StreamService");
const ChatService = require("./src/services/ChatService");
const AuthMiddleWare = require("./src/middleware/middleware.auth");
const { specs, swaggerUi } = require("./swagger");
const cookieParser = require("cookie-parser");
const logger = require("./src/utils/logger");
const requestMiddleware = require("./src/middleware/middleware.requestId");

//metrics - later

let shuttingDown = false;
let sigintHandlerRegistered = false;
let server;
let io;

const app = express();

if (process.env.NODE_ENV === "production" && fs.existsSync("./fullchain.pem")) {
  const httpsOptions = {
    key: fs.readFileSync("./privkey.pem"),
    cert: fs.readFileSync("./fullchain.pem"),
  };
  server = https.createServer(httpsOptions, app);
  logger.info("Using HTTPS server");
} else {
  server = http.createServer(app);
  logger.info("Using HTTP server");
}
io = socketIo(server, {
  cors: {
    origin:
      process.env.CORS_ORIGIN ||
      process.env.CLIENT_URL ||
      "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});
app.set("io", io);

if (process.env.NODE_ENV !== "test") {
  app.use(helmet());
}

app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN ||
      process.env.CLIENT_URL ||
      "http://localhost:3000",
    credentials: true,
  })
);
app.use(requestMiddleware);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Serve test frontend
app.use("/test", express.static("test-frontend"));

// Rate Limiter
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this ip",
});

// Temporarily disable rate limiting for testing
// const authLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 5,
//     message: "Too much authentication requests"
// })

// app.use('/api', generateLimiter);
// app.use('/api/auth', authLimiter);

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "ILS API Documentation",
  })
);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 3600
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

let mediaService, messageQueue, cacheService, streamService, chatService;
// metricService;

async function initializeServices() {
  try {
    logger.info("Initializing services...");

    await mongoose.connect(
      process.env.DATABASE_URL || "mongodb://localhost:27018/streamhub",
      {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }
    );
    logger.info("Database connected", {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      url: process.env.DATABASE_URL?.replace(
        /\/\/([^:]+):([^@]+)@/,
        "//$1:****@"
      ), // Hide password
    });

    mediaService = new MediaService(logger);
    await mediaService.initialize();

    // Temporarily disabled for streaming testing
    messageQueue = new MessageQueue(logger);
    // await messageQueue.connect();

    cacheService = new CacheService(logger);
    // await cacheService.connect();

    // metricsService = new MetricsService();
    streamService = new StreamService(
      mediaService,
      messageQueue,
      cacheService,
      logger
    );
    chatService = new ChatService(messageQueue, cacheService, logger);

    // Register routes after services are initialized
    app.use("/api/auth", require("./src/routes/routes.auth")(logger));
    app.use(
      "/api/streams",
      require("./src/routes/routes.stream")(
        streamService,
        logger,
        AuthMiddleWare
      )
    );
    app.use(
      "/api/chat",
      AuthMiddleWare.authenticate,
      require("./src/routes/routes.chat")(chatService, logger)
    );

    logger.info("All services initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize services:", error);
    process.exit(1);
  }
}

// Graceful shutdown
if (!sigintHandlerRegistered) {
  sigintHandlerRegistered = true;
  process.on("SIGINT", async () => {
    if (shuttingDown) return; // Prevent multiple executions
    shuttingDown = true;
    
    logger.info("Shutting down gracefully...");

    // Close all active connections
    io?.emit("server-shutdown");

    // Close services
    await mediaService?.cleanup();
    // await messageQueue?.close();
    // await cacheService?.disconnect();
    await mongoose.disconnect();

    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 5000);
  });
}

// Routes will be registered after services are initialized

// Socket.io handling
io.use(AuthMiddleWare.socketAuth);
io.use((socket, next) => {
  socket.on("error", (error) => {
    logger.error(`Socket error: ${error}`);
  });
  next();
});

const activeConnections = new Map();

io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}, User: ${socket.userId}`);
  activeConnections.set(socket.id, {
    userId: socket.userId,
    connectedAt: Date.now(),
  });

  //   metricsService.incrementActiveConnections();

  socket.on("create-stream", async (data, callback) => {
    try {
      if (!data?.title || data.title.length > 100) {
        return callback?.({ error: "Invalid stream title" });
      }

      const stream = await streamService.createStream(socket.userId, data);
      socket.join(`room:${stream.id}`);
      socket.emit("stream-created", stream);

      logger.info(`Stream created: ${stream.id} by user: ${socket.userId}`);
      //   metricsService.incrementActiveStreams();

      if (callback) callback?.({ success: true, stream });
    } catch (error) {
      logger.error("Create stream error", error);
      if (callback) callback?.({ error: error.message });
    }
  });

  socket.on("join-stream", async (data, callback) => {
    try {
      if (!data?.streamId) {
        return callback?.({ error: "stream id required" });
      }

      socket.join(`room:${data.streamId}`);

      // Get existing producers in the room and notify the new viewer
      const existingProducers = [];
      const room = mediaService.rooms.get(data.streamId);
      if (room) {
        for (const [participantId, participant] of room.participants) {
          if (participantId !== socket.userId) {
            for (const [producerId, producer] of participant.producers) {
              existingProducers.push({
                id: producer.id,
                kind: producer.kind,
                userId: participantId,
              });
              logger.info(
                `Found existing producer ${producer.id} (${producer.kind}) from ${participantId}`
              );
            }
          }
        }
      }

      if (existingProducers.length > 0) {
        socket.emit("existing-producers", existingProducers);
        logger.info(
          `Sent ${existingProducers.length} existing producers to ${socket.userId}`
        );

        // Send stream start time in background (non-blocking)
        streamService.getStreamInfo(data.streamId).then(streamInfo => {
          if (streamInfo?.startedAt) {
            io.to(`room:${data.streamId}`).emit("stream-start-time", {
              startTime: new Date(streamInfo.startedAt).getTime(),
            });
            logger.info(`Sent stream start time to ${socket.userId}`);
          }
        }).catch(err => logger.error('Failed to get stream info:', err));
      } else {
        logger.info(`No existing producers found for room ${data.streamId}`);
      }

      // Get actual viewer count from socket room - count unique users
      const roomSockets = await io.in(`room:${data.streamId}`).fetchSockets();
      const uniqueUsers = new Set();
      roomSockets.forEach(s => {
        if (s.userId) uniqueUsers.add(s.userId);
      });
      const viewerCount = uniqueUsers.size - 1; // Subtract streamer

      console.log(`📊 Room ${data.streamId} has ${roomSockets.length} sockets, ${uniqueUsers.size} unique users`);
      console.log(
        `📊 Socket IDs in room:`,
        roomSockets.map((s) => `${s.id} (user: ${s.userId})`)
      );

      // Broadcast viewer count to all in room
      io.to(`room:${data.streamId}`).emit("viewer-count", viewerCount);
      console.log(
        `📊 Emitted viewer-count: ${viewerCount} to room:${data.streamId}`
      );

      socket.to(`room:${data.streamId}`).emit("viewer-joined", {
        userId: socket.userId,
        viewers: viewerCount,
      });

      socket.emit("stream-joined", { success: true });
      logger.info(
        `User ${socket.userId} joined stream ${data.streamId}, total viewers: ${viewerCount}`
      );

      // Update DB in background (non-blocking)
      streamService.joinStream(socket.userId, data.streamId).catch(err => 
        logger.error('Background joinStream DB update failed:', err)
      );

      if (callback) callback?.({ success: true });
    } catch (error) {
      logger.error("Join stream error", error);
      if (callback) callback?.({ error: error.message });
    }
  });

  //webrtc signaling with enhanced error handling
  socket.on("get-router-capabilities", (callback) => {
    try {
      const capabilities = mediaService.getRouterCapabilities();
      callback?.(capabilities);
    } catch (error) {
      logger.error("Get router capabilities error", error);
      callback?.({
        error: `Failed to get router capabilities ${error.message}`,
      });
    }
  });

  socket.on("create-transport", async (data, callback) => {
    try {
      if (!data?.roomId || !data?.direction) {
        return callback?.({ error: "Invalid transport parameters" });
      }

      if (!["send", "recv"].includes(data.direction)) {
        return callback?.({ error: "Invalid transport direction" });
      }

      const transport = await streamService.createTransport(
        data.roomId,
        socket.userId,
        data.direction
      );

      if (data.direction === "send") {
        socket.join(`room:${data.roomId}`);
        logger.info(`User ${socket.userId} joined room ${data.roomId}`);
      }

      callback?.(transport);
    } catch (error) {
      logger.error("Create transport error", error);
      callback?.({ error: error.message });
    }
  });

  socket.on("connect-transport", async (data, callback) => {
    try {
      if (!data?.transportId || !data?.dtlsParameters) {
        return callback?.({ error: "Invalid connect transport parameters" });
      }

      await streamService.connectTransport(
        data.roomId,
        socket.userId,
        data.transportId,
        data.dtlsParameters
      );

      callback?.({ success: true });
    } catch (error) {
      logger.error("Connect transport error", error);
      callback?.({ error: error.message });
    }
  });

  socket.on("produce", async (data, callback) => {
    try {
      if (!data?.transportId || !data?.rtpParameters || !data?.kind) {
        return callback?.({ error: "Invalid produce parameters" });
      }

      const producer = await streamService.produce(
        data.roomId,
        socket.userId,
        data.transportId,
        data.rtpParameters,
        data.kind
      );

      socket.to(`room:${data.roomId}`).emit("new-producer", {
        userId: socket.userId,
        producerId: producer.id,
        kind: producer.kind,
      });

      callback?.({ producerId: producer.id });
    } catch (error) {
      logger.error("Produce error", error);
      callback?.({ error: error.message });
    }
  });

  socket.on("consume", async (data, callback) => {
    try {
      if (!data?.producerId || !data?.rtpCapabilities) {
        return callback?.({ error: "Invalid consume parameters" });
      }

      const consumer = await streamService.consume(
        data.roomId,
        socket.userId,
        data.producerId,
        data.rtpCapabilities
      );

      callback?.(consumer);
    } catch (error) {
      logger.error("Consume error", error);
      callback?.({ error: error.message });
    }
  });

  socket.on("resume-consumer", async (data, callback) => {
    try {
      await streamService.resumeConsumer(
        data.roomId,
        socket.userId,
        data.consumerId
      );
      if (callback) callback?.({ success: true });
    } catch (error) {
      logger.error("Resume consumer error", error);
      if (callback) callback?.({ error: error.message });
    }
  });

  socket.on("get-producers", async (data, callback) => {
    try {
      const producers = [];
      const room = mediaService.rooms.get(data.roomId);
      if (room) {
        for (const [participantId, participant] of room.participants) {
          if (participantId !== socket.userId) {
            for (const [producerId, producer] of participant.producers) {
              producers.push({
                id: producer.id,
                kind: producer.kind,
                userId: participantId,
              });
            }
          }
        }
      }
      logger.info(
        `Found ${producers.length} existing producers for room ${data.roomId}`
      );
      callback?.(producers);
    } catch (error) {
      logger.error("Get producers error", error);
      callback?.([]);
    }
  });

  socket.on("close-producer", async (data, callback) => {
    try {
      const { roomId, producerId } = data;
      const room = mediaService.rooms.get(roomId);
      if (room) {
        const participant = room.participants.get(socket.userId);
        if (participant) {
          const producer = participant.producers.get(producerId);
          if (producer) {
            producer.close();
            participant.producers.delete(producerId);
            socket.to(`room:${roomId}`).emit("producer-closed", { producerId });
            logger.info(`Producer ${producerId} closed by user ${socket.userId}`);
          }
        }
      }
      callback?.({ success: true });
    } catch (error) {
      logger.error("Close producer error", error);
      callback?.({ error: error.message });
    }
  });

  socket.on("join-chat", ({ streamId }, callback) => {
    if (!streamId) {
      return callback?.({ error: "streamId required" });
    }
    socket.join(`room:${streamId}`);
    callback?.({ success: true });
  });

  socket.on("subscribe-viewer-count", async (data) => {
    try {
      const { streamId } = data;
      if (!streamId) return;

      // Get current viewer count for this stream - count unique users
      const roomSockets = await io.in(`room:${streamId}`).fetchSockets();
      const uniqueUsers = new Set();
      roomSockets.forEach(s => {
        if (s.userId) uniqueUsers.add(s.userId);
      });
      const viewerCount = uniqueUsers.size - 1; // Subtract streamer

      // Send current count to this socket
      socket.emit("viewer-count", viewerCount);

      logger.debug(`Sent viewer count for stream ${streamId}: ${viewerCount}`);
    } catch (error) {
      logger.error("Subscribe viewer count error", error);
    }
  });

  socket.on("send-message", async (data, callback) => {
    try {
      if (!data?.roomId || !data?.content || data?.content.length > 500) {
        return callback?.({ error: "Invalid message parameters" });
      }

      const message = await chatService.sendMessage(
        socket.userId,
        data.roomId,
        data.content,
        data.type || "text",
        socket.user?.username || "Anonymous"
      );

      io.to(`room:${data.roomId}`).emit("new-message", message);
      if (callback) callback?.({ success: true, message });
    } catch (error) {
      logger.error("Send message error", error);
      if (callback) callback?.({ error: error.message });
    }
  });

  socket.on("disconnecting", async () => {
    logger.info(`Client disconnecting: ${socket.id}`);

    const rooms = Array.from(socket.rooms);

    //clean up from all the rooms
    for (const roomId of rooms) {
      if (roomId.startsWith("room:")) {
        const streamId = roomId.replace("room:", "");
        try {
          // Get producers before cleanup to notify viewers
          const room = mediaService.rooms.get(streamId);
          const closedProducers = [];
          if (room) {
            const participant = room.participants.get(socket.userId);
            if (participant) {
              for (const [producerId, producer] of participant.producers) {
                closedProducers.push(producerId);
              }
            }
          }

          await streamService.handleUserDisconnect(streamId, socket.userId);

          // Notify viewers about closed producers
          closedProducers.forEach(producerId => {
            socket.to(roomId).emit("producer-closed", { producerId });
          });

          // Update viewer count after disconnect - count unique users
          const roomSockets = await io.in(roomId).fetchSockets();
          const uniqueUsers = new Set();
          roomSockets.forEach(s => {
            if (s.userId && s.id !== socket.id) uniqueUsers.add(s.userId);
          });
          const finalCount = Math.max(0, uniqueUsers.size - 1); // Subtract streamer
          io.to(roomId).emit("viewer-count", finalCount);
          // io.emit("viewer-count", { streamId, count: finalCount });

          socket.to(roomId).emit("viewer-left", {
            userId: socket.userId,
          });
        } catch (error) {
          logger.error(
            `Error handling disconnect from room ${roomId}: `,
            error
          );
        }
      }
    }
  });

  socket.on("disconnect", (reason) => {
    logger.info(`Client disconnected: ${socket.id}, Reason: ${reason}`);
    activeConnections.delete(socket.id);

    //  metricsService.decrementActiveConnections();
  });

  socket.on("error", (error) => {
    logger.error(`Socket error for ${socket.id}: ${error}`);
  });
});

app.use((err, req, res, next) => {
  logger.error(err.message, { requestId: req.requestId, stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    requestId: req.requestId,
  });
});

const PORT = process.env.PORT || 3001;

initializeServices().then(() => {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
});
