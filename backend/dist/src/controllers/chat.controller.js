"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_types_1 = require("../types/error.types");
const logger_1 = __importDefault(require("../utils/logger"));
const ChatController = {
    // GET /api/chat/:streamId - Get chat messages
    getMessages: (chatService) => async (req, res) => {
        try {
            const { streamId } = req.params;
            const { limit = "50", before } = req.query;
            const messages = await chatService.getMessages(Array.isArray(streamId) ? streamId[0] : streamId, parseInt(limit), before || null);
            // Filter deleted messages unless user is moderator/admin
            const filteredMessages = messages.map((message) => {
                if (message.deleted &&
                    (!req.user ||
                        (req.user.role !== "admin" &&
                            req.user.role !== "moderator"))) {
                    return { ...message, content: "[Message deleted]" };
                }
                return message;
            });
            res.json({
                success: true,
                messages: filteredMessages,
                total: filteredMessages.length,
                hasMore: filteredMessages.length === parseInt(limit),
            });
        }
        catch (error) {
            logger_1.default.error("Get chat messages error", error);
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
    // POST /api/chat/:streamId - Send a chat message
    sendMessage: (chatService) => async (req, res) => {
        try {
            const { streamId } = req.params;
            const { content, type = "text" } = req.body;
            const isTimedOut = await chatService.isUserTimedOut(req.userId);
            if (isTimedOut) {
                throw new error_types_1.ForbiddenError("You are currently timed out and cannot send messages.");
            }
            const message = await chatService.sendMessage(req.userId, Array.isArray(streamId) ? streamId[0] : streamId, content, type);
            res.status(201).json({
                success: true,
                message: "Message sent successfully",
                data: message,
            });
        }
        catch (error) {
            logger_1.default.error("Send chat message error", error);
            if (error instanceof Error) {
                if (error.message.includes("Rate limit")) {
                    res
                        .status(429)
                        .json({ success: false, error: { message: error.message } });
                    return;
                }
                if (error.message.includes("spam")) {
                    res
                        .status(400)
                        .json({
                        success: false,
                        error: { message: "Message flagged as spam" },
                    });
                    return;
                }
            }
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
    // DELETE /api/chat/:streamId/:messageId - Delete a chat message
    deleteMessage: (chatService) => async (req, res) => {
        try {
            const { messageId } = req.params;
            if (!messageId) {
                throw new error_types_1.ValidationError("Message ID is required");
            }
            const msgId = Array.isArray(messageId) ? messageId[0] : messageId;
            const isModeratorOrOwner = req.user?.role === "admin" ||
                req.user?.role === "moderator" ||
                (await chatService.isMessageOwner(msgId, req.userId));
            const result = await chatService.deleteMessage(msgId, req.userId, isModeratorOrOwner);
            if (result) {
                res.json({ success: true, message: "Message deleted successfully" });
            }
            else {
                throw new error_types_1.NotFoundError("Message not found or already deleted");
            }
        }
        catch (error) {
            logger_1.default.error("Delete chat message error", error);
            if (error instanceof Error) {
                if (error.message.includes("Unauthorized")) {
                    res
                        .status(403)
                        .json({ success: false, error: { message: "Access denied" } });
                    return;
                }
                if (error.message.includes("not found")) {
                    res
                        .status(404)
                        .json({
                        success: false,
                        error: { message: "Message not found" },
                    });
                    return;
                }
            }
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
    // POST /api/chat/:streamId/:messageId/react - Add reaction to message
    addReaction: (chatService) => async (req, res) => {
        try {
            const { messageId } = req.params;
            const { emoji } = req.body;
            if (!messageId) {
                throw new error_types_1.ValidationError("Message ID is required");
            }
            const msgId = Array.isArray(messageId) ? messageId[0] : messageId;
            const reactions = await chatService.addReaction(msgId, req.userId, emoji);
            res.json({
                success: true,
                message: "Reaction updated successfully",
                reactions,
            });
        }
        catch (error) {
            logger_1.default.error("Add reaction error", error);
            if (error instanceof Error && error.message.includes("not found")) {
                res
                    .status(404)
                    .json({ success: false, error: { message: "Message not found" } });
                return;
            }
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
    // POST /api/chat/:streamId/:messageId/moderate - Moderate a message
    moderateMessage: (chatService) => async (req, res) => {
        try {
            const { messageId } = req.params;
            const { action, reason = "" } = req.body;
            if (!messageId) {
                throw new error_types_1.ValidationError("Message ID is required");
            }
            const msgId = Array.isArray(messageId) ? messageId[0] : messageId;
            const moderationResult = await chatService.moderateMessage(msgId, action, req.userId, reason);
            logger_1.default.info(`Message moderated: ${msgId}, action: ${action}, by: ${req.userId}`);
            res.json({
                success: true,
                message: `Message ${action} successfully`,
                moderation: moderationResult,
            });
        }
        catch (error) {
            logger_1.default.error("Moderate message error", error);
            if (error instanceof Error && error.message.includes("not found")) {
                res
                    .status(404)
                    .json({ success: false, error: { message: "Message not found" } });
                return;
            }
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
    // GET /api/chat/:streamId/stats - Get chat statistics
    getChatStats: (chatService) => async (req, res) => {
        try {
            const { streamId } = req.params;
            const stats = await chatService.getChatStats(Array.isArray(streamId) ? streamId[0] : streamId);
            res.json({ success: true, stats });
        }
        catch (error) {
            logger_1.default.error("Get chat stats error", error);
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
    // POST /api/chat/:streamId/:messageId/flag - Flag a message for moderation
    flagMessage: (chatService) => async (req, res) => {
        try {
            const { messageId } = req.params;
            const { reason, details = "" } = req.body;
            if (!messageId) {
                throw new error_types_1.ValidationError("Message ID is required");
            }
            const msgId = Array.isArray(messageId) ? messageId[0] : messageId;
            const result = await chatService.flagMessage(msgId, req.userId, reason, details);
            res.json({
                success: true,
                message: "Message flagged successfully",
                flagId: result.id,
            });
        }
        catch (error) {
            logger_1.default.error("Flag message error", error);
            if (error instanceof Error) {
                if (error.message.includes("already flagged")) {
                    res
                        .status(409)
                        .json({
                        success: false,
                        error: { message: "Message already flagged by you" },
                    });
                    return;
                }
                if (error.message.includes("not found")) {
                    res
                        .status(404)
                        .json({
                        success: false,
                        error: { message: "Message not found" },
                    });
                    return;
                }
            }
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
};
exports.default = ChatController;
//# sourceMappingURL=chat.controller.js.map