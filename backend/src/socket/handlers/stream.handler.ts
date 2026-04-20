import type { Server as SocketIOServer } from "socket.io";
import type { Logger } from "winston";
import type MediaService from "../../services/MediaService";
import type StreamService from "../../services/StreamService";
import type { AuthenticatedSocket } from "../../types/socket.types";
import { updateViewerStats } from "../../utils/streamStats";

interface Services {
  mediaService: MediaService;
  streamService: StreamService;
  logger: Logger;
}

interface CreateStreamData {
  title: string;
  description?: string;
  category?: string;
  isPrivate?: boolean;
  chatEnabled?: boolean;
  recordingEnabled?: boolean;
  tags?: string[];
  thumbnail?: string;
}

interface JoinStreamData {
  streamId: string;
}

interface SubscribeViewerCountData {
  streamId: string;
}

interface ActiveConnection {
  userId: string;
  connectedAt: number;
}

export function registerStreamHandlers(
  socket: AuthenticatedSocket,
  services: Services,
  io: SocketIOServer,
  activeConnections: Map<string, ActiveConnection>,
): void {
  const { mediaService, streamService, logger } = services;

  // Create stream
  socket.on("create-stream", async (data: CreateStreamData, callback?: (result: unknown) => void) => {
    try {
      if (!data?.title || data.title.length > 100) {
        return callback?.({ error: "Invalid stream title" });
      }

      const stream = await streamService.createStream(socket.userId, data);
      socket.join(`room:${stream.id}`);
      socket.emit("stream-created", stream);

      logger.info(`Stream created: ${stream.id} by user: ${socket.userId}`);

      if (callback) callback?.({ success: true, stream });
    } catch (error) {
      const err = error as Error;
      logger.error("Create stream error", error);
      if (callback) callback?.({ error: err.message });
    }
  });

  // Join stream
  socket.on("join-stream", async (data: JoinStreamData, callback?: (result: unknown) => void) => {
    try {
      if (!data?.streamId) {
        return callback?.({ error: "stream id required" });
      }

      socket.join(`room:${data.streamId}`);

      // Get existing producers in the room and notify the new viewer
      const existingProducers: unknown[] = [];
      const room = mediaService.getRoom(data.streamId);
      if (room) {
        for (const [participantId, participant] of room.participants) {
          if (participantId !== socket.userId) {
            for (const [producerId, producer] of participant.producers) {
              existingProducers.push({
                id: producer.id,
                kind: producer.kind,
                userId: participantId,
                isScreenShare: producer.appData?.isScreenShare || false,
              });
              logger.info(
                `Found existing producer ${producer.id} (${producer.kind}) from ${participantId} ${producer.appData?.isScreenShare ? "[SCREEN]" : "[CAMERA]"}`,
              );
            }
          }
        }
      }

      if (existingProducers.length > 0) {
        socket.emit("existing-producers", existingProducers);
        logger.info(
          `Sent ${existingProducers.length} existing producers to ${socket.userId}`,
        );

        // Send stream start time in background (non-blocking)
        streamService
          .getStreamInfo(data.streamId)
          .then((streamInfo) => {
            if (streamInfo?.startedAt) {
              io.to(`room:${data.streamId}`).emit("stream-start-time", {
                startTime: new Date(streamInfo.startedAt).getTime(),
              });
              logger.info(`Sent stream start time to ${socket.userId}`);
            }
          })
          .catch((err: Error) => logger.error("Failed to get stream info:", err));
      } else {
        logger.info(`No existing producers found for room ${data.streamId}`);
      }

      // Get actual viewer count from socket room - count unique users
      const roomSockets = await io.in(`room:${data.streamId}`).fetchSockets();
      const uniqueUsers = new Set<string>();
      roomSockets.forEach((s) => {
        // RemoteSocket has data property that contains custom properties
        const userId = (s as unknown as { userId?: string }).userId;
        if (userId) uniqueUsers.add(userId);
      });
      const viewerCount = Math.max(0, uniqueUsers.size - 1); // Subtract streamer

      logger.debug(
        `📊 Room ${data.streamId} has ${roomSockets.length} sockets, ${uniqueUsers.size} unique users`,
      );

      // Broadcast viewer count to all in room
      io.to(`room:${data.streamId}`).emit("viewer-count", viewerCount);
      logger.debug(
        `📊 Emitted viewer-count: ${viewerCount} to room:${data.streamId}`,
      );

      // Update DB stats in background
      updateViewerStats(data.streamId, viewerCount).catch((err) =>
        logger.error("Failed to update viewer stats:", err),
      );

      socket.to(`room:${data.streamId}`).emit("viewer-joined", {
        userId: socket.userId,
        viewers: viewerCount,
      });

      socket.emit("stream-joined", { success: true });
      logger.info(
        `User ${socket.userId} joined stream ${data.streamId}, total viewers: ${viewerCount}`,
      );

      // Update DB in background (non-blocking)
      streamService
        .joinStream(socket.userId, data.streamId)
        .catch((err: Error) =>
          logger.error("Background joinStream DB update failed:", err),
        );

      if (callback) callback?.({ success: true });
    } catch (error) {
      const err = error as Error;
      logger.error("Join stream error", error);
      if (callback) callback?.({ error: err.message });
    }
  });

  // Subscribe to viewer count
  socket.on("subscribe-viewer-count", async (data: SubscribeViewerCountData) => {
    try {
      const { streamId } = data;
      if (!streamId) return;

      // Get current viewer count for this stream - count unique users
      const roomSockets = await io.in(`room:${streamId}`).fetchSockets();
      const uniqueUsers = new Set<string>();
      roomSockets.forEach((s) => {
        // RemoteSocket has data property that contains custom properties
        const userId = (s as unknown as { userId?: string }).userId;
        if (userId) uniqueUsers.add(userId);
      });
      const viewerCount = uniqueUsers.size - 1; // Subtract streamer

      // Send current count to this socket
      socket.emit("viewer-count", viewerCount);

      logger.debug(`Sent viewer count for stream ${streamId}: ${viewerCount}`);
    } catch (error) {
      logger.error("Subscribe viewer count error", error);
    }
  });

  // Disconnecting
  socket.on("disconnecting", async () => {
    logger.info(`Client disconnecting: ${socket.id}`);

    const rooms = Array.from(socket.rooms);

    //clean up from all the rooms
    for (const roomId of rooms) {
      if (roomId.startsWith("room:")) {
        const streamId = roomId.replace("room:", "");
        try {
          // Get producers before cleanup to notify viewers
          const room = mediaService.getRoom(streamId);
          const closedProducers: string[] = [];
          if (room) {
            const participant = room.participants.get(socket.userId);
            if (participant) {
              for (const [producerId] of participant.producers) {
                closedProducers.push(producerId);
              }
            }
          }

          await streamService.handleUserDisconnect(streamId, socket.userId);

          // Notify viewers about closed producers
          closedProducers.forEach((producerId) => {
            socket.to(roomId).emit("producer-closed", { producerId });
          });

          // Update viewer count after disconnect - count unique users
          const roomSockets = await io.in(roomId).fetchSockets();
          const uniqueUsers = new Set<string>();
          roomSockets.forEach((s) => {
            // RemoteSocket has data property that contains custom properties
            const userId = (s as unknown as { userId?: string }).userId;
            if (userId && s.id !== socket.id) uniqueUsers.add(userId);
          });
          const finalCount = Math.max(0, uniqueUsers.size - 1); // Subtract streamer
          io.to(roomId).emit("viewer-count", finalCount);

          // Update DB stats in background
          updateViewerStats(streamId, finalCount).catch((err) =>
            logger.error("Failed to update viewer stats on disconnect:", err),
          );

          socket.to(roomId).emit("viewer-left", {
            userId: socket.userId,
          });
        } catch (error) {
          logger.error(
            `Error handling disconnect from room ${roomId}: `,
            error,
          );
        }
      }
    }
  });

  // Disconnect
  socket.on("disconnect", (reason: string) => {
    logger.info(`Client disconnected: ${socket.id}, Reason: ${reason}`);
    activeConnections.delete(socket.id);
  });
}
