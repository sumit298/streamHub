"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStreamHandlers = registerStreamHandlers;
const streamStats_1 = require("../../utils/streamStats");
function registerStreamHandlers(socket, services, io, activeConnections) {
    const { mediaService, streamService, logger } = services;
    // Create stream
    socket.on("create-stream", async (data, callback) => {
        try {
            if (!data?.title || data.title.length > 100) {
                return callback?.({ error: "Invalid stream title" });
            }
            const stream = await streamService.createStream(socket.userId, data);
            socket.join(`room:${stream.id}`);
            socket.emit("stream-created", stream);
            logger.info(`Stream created: ${stream.id} by user: ${socket.userId}`);
            if (callback)
                callback?.({ success: true, stream });
        }
        catch (error) {
            const err = error;
            logger.error("Create stream error", error);
            if (callback)
                callback?.({ error: err.message });
        }
    });
    // Join stream
    socket.on("join-stream", async (data, callback) => {
        try {
            if (!data?.streamId) {
                return callback?.({ error: "stream id required" });
            }
            socket.join(`room:${data.streamId}`);
            // Get existing producers in the room and notify the new viewer
            const existingProducers = [];
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
                            logger.info(`Found existing producer ${producer.id} (${producer.kind}) from ${participantId} ${producer.appData?.isScreenShare ? "[SCREEN]" : "[CAMERA]"}`);
                        }
                    }
                }
            }
            if (existingProducers.length > 0) {
                socket.emit("existing-producers", existingProducers);
                logger.info(`Sent ${existingProducers.length} existing producers to ${socket.userId}`);
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
                    .catch((err) => logger.error("Failed to get stream info:", err));
            }
            else {
                logger.info(`No existing producers found for room ${data.streamId}`);
            }
            // Get actual viewer count from socket room - count unique users
            const roomSockets = await io.in(`room:${data.streamId}`).fetchSockets();
            const uniqueUsers = new Set();
            roomSockets.forEach((s) => {
                // RemoteSocket has data property that contains custom properties
                const userId = s.userId;
                if (userId)
                    uniqueUsers.add(userId);
            });
            const viewerCount = Math.max(0, uniqueUsers.size - 1); // Subtract streamer
            logger.debug(`📊 Room ${data.streamId} has ${roomSockets.length} sockets, ${uniqueUsers.size} unique users`);
            // Broadcast viewer count to all in room
            io.to(`room:${data.streamId}`).emit("viewer-count", viewerCount);
            logger.debug(`📊 Emitted viewer-count: ${viewerCount} to room:${data.streamId}`);
            // Update DB stats in background
            (0, streamStats_1.updateViewerStats)(data.streamId, viewerCount).catch((err) => logger.error("Failed to update viewer stats:", err));
            socket.to(`room:${data.streamId}`).emit("viewer-joined", {
                userId: socket.userId,
                viewers: viewerCount,
            });
            socket.emit("stream-joined", { success: true });
            logger.info(`User ${socket.userId} joined stream ${data.streamId}, total viewers: ${viewerCount}`);
            // Update DB in background (non-blocking)
            streamService
                .joinStream(socket.userId, data.streamId)
                .catch((err) => logger.error("Background joinStream DB update failed:", err));
            if (callback)
                callback?.({ success: true });
        }
        catch (error) {
            const err = error;
            logger.error("Join stream error", error);
            if (callback)
                callback?.({ error: err.message });
        }
    });
    // Subscribe to viewer count
    socket.on("subscribe-viewer-count", async (data) => {
        try {
            const { streamId } = data;
            if (!streamId)
                return;
            // Get current viewer count for this stream - count unique users
            const roomSockets = await io.in(`room:${streamId}`).fetchSockets();
            const uniqueUsers = new Set();
            roomSockets.forEach((s) => {
                // RemoteSocket has data property that contains custom properties
                const userId = s.userId;
                if (userId)
                    uniqueUsers.add(userId);
            });
            const viewerCount = uniqueUsers.size - 1; // Subtract streamer
            // Send current count to this socket
            socket.emit("viewer-count", viewerCount);
            logger.debug(`Sent viewer count for stream ${streamId}: ${viewerCount}`);
        }
        catch (error) {
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
                    const closedProducers = [];
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
                    const uniqueUsers = new Set();
                    roomSockets.forEach((s) => {
                        // RemoteSocket has data property that contains custom properties
                        const userId = s.userId;
                        if (userId && s.id !== socket.id)
                            uniqueUsers.add(userId);
                    });
                    const finalCount = Math.max(0, uniqueUsers.size - 1); // Subtract streamer
                    io.to(roomId).emit("viewer-count", finalCount);
                    // Update DB stats in background
                    (0, streamStats_1.updateViewerStats)(streamId, finalCount).catch((err) => logger.error("Failed to update viewer stats on disconnect:", err));
                    socket.to(roomId).emit("viewer-left", {
                        userId: socket.userId,
                    });
                }
                catch (error) {
                    logger.error(`Error handling disconnect from room ${roomId}: `, error);
                }
            }
        }
    });
    // Disconnect
    socket.on("disconnect", (reason) => {
        logger.info(`Client disconnected: ${socket.id}, Reason: ${reason}`);
        activeConnections.delete(socket.id);
    });
}
//# sourceMappingURL=stream.handler.js.map