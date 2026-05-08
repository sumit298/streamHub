import http from "http";
import https from "https";
import fs from "fs";
import { Server as SocketIOServer } from "socket.io";
import type { Application } from "express";
import type { Logger } from "winston";

export interface ServerConfig {
  server: http.Server | https.Server;
  io: SocketIOServer;
}

export function createServer(app: Application, logger: Logger): ServerConfig {
  let server: http.Server | https.Server;

  if (process.env.NODE_ENV === "production") {
    const httpsOptions = {
      key: fs.readFileSync(
        "/etc/letsencrypt/live/stream-hub.duckdns.org-0001/privkey.pem",
      ),
      cert: fs.readFileSync(
        "/etc/letsencrypt/live/stream-hub.duckdns.org-0001/fullchain.pem",
      ),
    };

    server = https.createServer(httpsOptions, app);
    logger.info("Using HTTPS server");
  } else {
    server = http.createServer(app);
    logger.info("Using HTTP server");
  }

  const io = new SocketIOServer(server, {
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

  return { server, io };
}
