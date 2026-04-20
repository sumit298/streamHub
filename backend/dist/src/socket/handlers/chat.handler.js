"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatHandlers = registerChatHandlers;
const index_1 = require("../../models/index");
const streamStats_1 = require("../../utils/streamStats");
function registerChatHandlers(socket, services, io, chatRateLimits) {
    const { chatService, logger } = services;
    socket.on("join-chat", (data, callback) => {
        const { streamId } = data;
        if (!streamId) {
            return callback?.({ error: "Stream ID is required" });
        }
        socket.join(`room:${streamId}`);
        callback?.({ success: true });
    });
    socket.on("send-message", async (data, callback) => {
        try {
            if (!data?.roomId || !data?.content || data?.content.length > 500) {
                return callback?.({ error: "Invalid message data" });
            }
            const isTimedOut = await chatService.isUserTimedOut(socket.userId);
            if (isTimedOut) {
                return callback?.({ error: "You are timed out from chat" });
            }
            // Rate Limit: max 5 messages per 3 seconds per user
            const now = Date.now();
            const limit = chatRateLimits.get(socket.userId) || {
                count: 0,
                resetAt: now + 3000,
            };
            if (now > limit.resetAt) {
                limit.count = 0;
                limit.resetAt = now + 3000;
            }
            limit.count++;
            chatRateLimits.set(socket.userId, limit);
            if (limit.count > 5) {
                return callback?.({
                    error: "You are sending messages too quickly. Please slow down.",
                });
            }
            // Get username from socket.data or socket.user
            const username = socket.data?.username || socket.user?.username || "Anonymous";
            logger.info(`[CHAT] Sending message - userId: ${socket.userId}, username from socket.data: ${socket.data?.username}, username from socket.user: ${socket.user?.username}, final username: ${username}`);
            const message = await chatService.sendMessage(socket.userId, data.roomId, data.content, data.type || "text", username);
            (0, streamStats_1.incrementChatMessages)(data.roomId).catch((error) => logger.error("Error incrementing chat messages", error));
            if (!data?.roomId || !data?.content || data?.content.length > 500) {
                return callback?.({ error: "Invalid message parameters" });
            }
            if (message.mentions?.length > 0) {
                logger.info(`Processing ${message.mentions.length} mentions`);
                for (const mentionedUserId of message.mentions) {
                    logger.info(`Creating notification for user: ${mentionedUserId}`);
                    const notification = await index_1.Notification.create({
                        userId: mentionedUserId,
                        type: "chat-mention",
                        title: "New Mention",
                        message: `${username} mentioned you`,
                        data: { streamId: data.roomId },
                    });
                    logger.info(`Emitting notification to user-${mentionedUserId}`);
                    io.to(`user:${mentionedUserId}`).emit("notification", notification);
                }
            }
            io.to(`room:${data.roomId}`).emit("new-message", message);
        }
        catch (error) {
            const err = error;
            logger.error("Send message error", error);
            callback?.({ error: err.message });
        }
    });
    // mod action
    socket.on("mod-action", async (data) => {
        try {
            const { streamId, action, target, duration } = data;
            if (!streamId || !action || !target)
                return;
            // check if sender is the streamer
            const stream = await index_1.Stream.findOne({ id: streamId });
            if (!stream || stream.userId.toString() !== socket.userId)
                return;
            const targetUser = await index_1.User.findOne({ username: target });
            if (!targetUser)
                return;
            // Prevent streamer from banning themselves
            if (targetUser._id.toString() === socket.userId)
                return;
            // Check if cache service is available
            if (!chatService.cacheService?.client) {
                logger.warn("Cache service not available for slow mode");
                return;
            }
            if (action === "timeout") {
                const seconds = duration || 300;
                await chatService.cacheService.client.setex(`timeout:user:${targetUser._id}`, seconds, "true");
                io.to(`room:${streamId}`).emit("new-message", {
                    id: Date.now().toString(),
                    userId: "system",
                    username: "System",
                    content: `${target} has been timed out for ${seconds} seconds`,
                    timestamp: new Date().toISOString(),
                    type: "system",
                });
            }
            else if (action === "ban") {
                await chatService.cacheService.client.setex(`timeout:user:${targetUser._id}`, 3600, // 1 hour
                "true");
                io.to(`room:${streamId}`).emit("new-message", {
                    id: Date.now().toString(),
                    userId: "system",
                    username: "System",
                    content: `${target} has been banned from chat`,
                    timestamp: new Date().toISOString(),
                    type: "system",
                });
            }
        }
        catch (error) {
            logger.error("Mod action error:", error);
        }
    });
    // Slow mode
    socket.on("slow-mode", async (data) => {
        try {
            const { streamId, seconds } = data;
            if (!streamId)
                return;
            const stream = await index_1.Stream.findOne({ id: streamId });
            if (!stream || stream.userId.toString() !== socket.userId)
                return;
            // Check if cache service is available
            if (!chatService.cacheService?.client) {
                logger.warn("Cache service not available for slow mode");
                return;
            }
            if (seconds > 0) {
                await chatService.cacheService.client.setex(`slowmode:${streamId}`, 86400, seconds.toString());
                io.to(`room:${streamId}`).emit("new-message", {
                    id: Date.now().toString(),
                    userId: "system",
                    username: "System",
                    content: `Slow mode enabled: ${seconds}s between messages`,
                    timestamp: new Date().toISOString(),
                    type: "system",
                });
            }
            else {
                await chatService.cacheService.client.del(`slowmode:${streamId}`);
                io.to(`room:${streamId}`).emit("new-message", {
                    id: Date.now().toString(),
                    userId: "system",
                    username: "System",
                    content: `Slow mode disabled`,
                    timestamp: new Date().toISOString(),
                    type: "system",
                });
            }
        }
        catch (error) {
            logger.error("Slow mode error:", error);
        }
    });
    // Unban user
    socket.on("unban-user", async (data) => {
        try {
            const { streamId, target } = data;
            if (!streamId || !target)
                return;
            const stream = await index_1.Stream.findOne({ id: streamId });
            if (!stream || stream.userId.toString() !== socket.userId)
                return;
            const targetUser = await index_1.User.findOne({ username: target });
            if (!targetUser)
                return;
            // Check if cache service is available
            if (!chatService.cacheService?.client) {
                logger.warn("Cache service not available for slow mode");
                return;
            }
            const removed = await chatService.cacheService.client.del(`timeout:user:${targetUser._id}`);
            io.to(`room:${streamId}`).emit("new-message", {
                id: Date.now().toString(),
                userId: "system",
                username: "System",
                content: removed
                    ? `${target} has been unbanned`
                    : `${target} is not banned`,
                timestamp: new Date().toISOString(),
                type: "system",
            });
        }
        catch (error) {
            logger.error("Unban error:", error);
        }
    });
    // Delete message
    socket.on("delete-message", async (data) => {
        try {
            const { streamId, messageId } = data;
            if (!streamId || !messageId)
                return;
            const stream = await index_1.Stream.findOne({ id: streamId });
            if (!stream || stream.userId.toString() !== socket.userId)
                return;
            io.to(`stream:${streamId}`).emit("message-deleted", { messageId });
        }
        catch (error) {
            logger.error("Delete message error:", error);
        }
    });
    // Announce
    socket.on("announce", async (data) => {
        try {
            const { streamId, message } = data;
            if (!streamId || !message)
                return;
            const stream = await index_1.Stream.findOne({ id: streamId });
            if (!stream || stream.userId.toString() !== socket.userId)
                return;
            io.to(`room:${streamId}`).emit("new-message", {
                id: Date.now().toString(),
                userId: "system",
                username: "Announcement",
                content: message,
                timestamp: new Date().toISOString(),
                type: "announce",
            });
        }
        catch (error) {
            logger.error("Announce error:", error);
        }
    });
}
//# sourceMappingURL=chat.handler.js.map