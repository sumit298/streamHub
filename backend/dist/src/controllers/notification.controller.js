"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Notification_1 = __importDefault(require("../models/Notification"));
const logger_1 = __importDefault(require("../utils/logger"));
const error_types_1 = require("../types/error.types");
const NotificationController = {
    getAllNotifications: async (req, res) => {
        try {
            if (!req.user?.id) {
                throw new error_types_1.AuthenticationError("User not authenticated");
            }
            const { limit = "20", unreadOnly = "false" } = req.query;
            const query = { userId: req.user.id };
            if (unreadOnly === "true")
                query.read = false;
            const notifications = await Notification_1.default.find(query)
                .sort({ createdAt: -1 })
                .limit(parseInt(limit));
            const unreadCount = await Notification_1.default.countDocuments({
                userId: req.user.id,
                read: false,
            });
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
            res.json({ notifications, unreadCount });
        }
        catch (error) {
            logger_1.default.error("Get notifications error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    markAsRead: async (req, res) => {
        try {
            if (!req.user?.id) {
                throw new error_types_1.AuthenticationError("User not authenticated");
            }
            const notification = await Notification_1.default.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { read: true }, { new: true });
            if (!notification) {
                throw new error_types_1.NotFoundError("Notification not found");
            }
            res.json({ success: true, message: "Notification marked as read" });
        }
        catch (error) {
            logger_1.default.error("Mark as read error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    markAllAsRead: async (req, res) => {
        try {
            if (!req.user?.id) {
                throw new error_types_1.AuthenticationError("User not authenticated");
            }
            const result = await Notification_1.default.updateMany({ userId: req.user.id, read: false }, { read: true });
            res.json({
                success: true,
                message: "All notifications marked as read",
                count: result.modifiedCount,
            });
        }
        catch (error) {
            logger_1.default.error("Mark all as read error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
};
exports.default = NotificationController;
//# sourceMappingURL=notification.controller.js.map