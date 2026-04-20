"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWebRTCHandlers = registerWebRTCHandlers;
function registerWebRTCHandlers(socket, services) {
    const { mediaService, streamService, logger } = services;
    // Get router capabilities
    socket.on("get-router-capabilities", ({ roomId }, callback) => {
        try {
            const room = mediaService.getRoom(roomId);
            if (!room)
                throw new Error("Room not found");
            if (callback)
                callback(room.router.rtpCapabilities);
        }
        catch (err) {
            const error = err;
            if (callback)
                callback({ error: error.message });
        }
    });
    // Create transport
    socket.on("create-transport", async (data, callback) => {
        try {
            if (!data.roomId || !data.direction) {
                return callback?.({ error: "Invalid transport parameters" });
            }
            if (!["send", "recv"].includes(data.direction)) {
                return callback?.({ error: "Invalid transport direction" });
            }
            const transport = await streamService.createTransport(data.roomId, socket.userId, data.direction);
            if (data.direction === "send") {
                socket.join(`room:${data.roomId}`);
                logger.info(`User ${socket.userId} joined room ${data.roomId}`);
            }
            callback?.(transport);
        }
        catch (error) {
            logger.error("Error creating transport:", error);
            callback?.({ error: "Failed to create transport" });
        }
    });
    // Connect transport
    socket.on("connect-transport", async (data, callback) => {
        try {
            if (!data.transportId || !data.dtlsParameters) {
                return callback?.({ error: "Invalid transport parameters" });
            }
            await streamService.connectTransport(data.roomId, socket.userId, data.transportId, data.dtlsParameters);
            callback?.({ success: true });
        }
        catch (error) {
            const err = error;
            logger.error("Connect transport error", error);
            callback?.({ error: err.message });
        }
    });
    // Produce media
    socket.on("produce", async (data, callback) => {
        try {
            if (!data?.transportId || !data.rtpParameters || !data.kind) {
                return callback?.({ error: "Invalid produce parameters" });
            }
            const producer = await streamService.produce(data.roomId, socket.userId, data.transportId, data.rtpParameters, data.kind, data.isScreenShare || false);
            socket.to(`room:${data.roomId}`).emit("new-producer", {
                userId: socket.userId,
                producerId: producer?.id,
                kind: producer?.kind,
                isScreenShare: data.isScreenShare || false,
            });
            callback?.({ producerId: producer?.id });
        }
        catch (error) {
            const err = error;
            logger.error("Produce error", error);
            callback?.({ error: err.message });
        }
    });
    // Consume media
    socket.on("consume", async (data, callback) => {
        try {
            if (!data?.rtpCapabilities || !data?.producerId) {
                return callback?.({ error: "Invalid consume parameters" });
            }
            const consumer = await streamService.consume(data.roomId, socket.userId, data.producerId, data.rtpCapabilities);
            callback?.(consumer);
        }
        catch (error) {
            const err = error;
            logger.error("Consume error", error);
            callback?.({ error: err.message });
        }
    });
    // Resume consumer
    socket.on("resume-consumer", async (data, callback) => {
        try {
            if (!data?.consumerId) {
                return callback?.({ error: "Invalid resume parameters" });
            }
            await streamService.resumeConsumer(data.roomId, socket.userId, data.consumerId);
            if (callback)
                callback?.({ success: true });
        }
        catch (error) {
            const err = error;
            logger.error("Resume consumer error", error);
            callback?.({ error: err.message });
        }
    });
    // Get producers
    socket.on("get-producers", async (data, callback) => {
        try {
            const producers = [];
            const room = mediaService.getRoom(data.roomId);
            if (room) {
                for (const [participantId, participant] of room.participants) {
                    if (participantId !== socket.userId) {
                        for (const [producerId, producer] of participant.producers) {
                            producers.push({
                                id: producer.id,
                                kind: producer.kind,
                                userId: participantId,
                                isScreenShare: producer.appData?.isScreenShare || false,
                            });
                        }
                    }
                }
            }
            logger.info(`Found ${producers.length} existing producers for room ${data.roomId}`);
            callback?.(producers);
        }
        catch (error) {
            logger.error("Get producers error", error);
            callback?.([]);
        }
    });
    // Close producer
    socket.on("close-producer", async (data, callback) => {
        try {
            const { roomId, producerId } = data;
            const room = mediaService.getRoom(roomId);
            if (room) {
                const participant = room.participants.get(socket.userId);
                if (participant) {
                    const producer = participant.producers.get(producerId);
                    if (producer) {
                        producer.close();
                        participant.producers.delete(producerId);
                        socket
                            .to(`room:${roomId}`)
                            .emit("producer-closed", { producerId });
                        logger.info(`Producer ${producerId} closed by user ${socket.userId}`);
                    }
                }
            }
            callback?.({ success: true });
        }
        catch (error) {
            const err = error;
            logger.error("Close producer error", error);
            callback?.({ error: err.message });
        }
    });
}
//# sourceMappingURL=webrtc.handler.js.map