import Notification from "@models/Notification";
import type { Request, Response } from "express";
import Logger from "@utils/logger";
import {
  normalizeError,
  AuthenticationError,
  NotFoundError,
} from "../types/error.types";

interface GetNotificationsQuery {
  limit?: string;
  unreadOnly?: string;
}

const NotificationController = {
  getAllNotifications: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AuthenticationError("User not authenticated");
      }
      const { limit = "20", unreadOnly = "false" } =
        req.query as GetNotificationsQuery;
      const query: any = { userId: req.user.id };
      if (unreadOnly === "true") query.read = false;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      const unreadCount = await Notification.countDocuments({
        userId: req.user.id,
        read: false,
      });

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      res.json({ notifications, unreadCount });
    } catch (error) {
      Logger.error("Get notifications error:", error);
      const appError = normalizeError(error);
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

  markAsRead: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AuthenticationError("User not authenticated");
      }
      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { read: true },
        { new: true },
      );

      if (!notification) {
        throw new NotFoundError("Notification not found");
      }
      res.json({ success: true, message: "Notification marked as read" });
    } catch (error) {
      Logger.error("Mark as read error:", error);
      const appError = normalizeError(error);
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

  markAllAsRead: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AuthenticationError("User not authenticated");
      }
      const result = await Notification.updateMany(
        { userId: req.user.id, read: false },
        { read: true },
      );
      res.json({
        success: true,
        message: "All notifications marked as read",
        count: result.modifiedCount,
      });
    } catch (error) {
      Logger.error("Mark all as read error:", error);
      const appError = normalizeError(error);
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

export default NotificationController;
