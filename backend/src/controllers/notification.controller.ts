import type { Request, Response } from 'express';
import Logger from '@utils/logger'
import { NOTIFICATION_TYPES } from '@models/Notification';
import type NotificationService from '@services/NotificationService';
import type { NotificationType } from '@appTypes/notification.types';
import {
  normalizeError,
  AuthenticationError,
  ValidationError
} from '@appTypes/error.types'

interface ListNotificationsQuery {
  cursor?: string;
  limit?: string;
  unread?: string;
  type?: string;
}

interface MarkReadBody {
  ids?: string[];
  all?: boolean;
}

const MAX_IDS_PER_REQUEST = 100;

const getNotificationService = (req: Request): NotificationService =>
  req.app.get("notificationService");

const sendError = (res: Response, error: unknown): void => {
  const appError = normalizeError(error);
  res.status(appError.statusCode).json({
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,

    }
  })
}

const NotificationController = {
  list: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AuthenticationError("User not authenticated");
      }

      const { cursor, limit, unread, type } = req.query as ListNotificationsQuery;

      if (type !== undefined && !NOTIFICATION_TYPES.includes(type as NotificationType)) {
        throw new ValidationError("Unknown notification type");
      }

      // A query value can arrive as an object or array (?cursor[$gt]=), so only accept a string
      if (cursor !== undefined && typeof cursor !== "string") {
        throw new ValidationError("Invalid cursor");
      }

      const result = await getNotificationService(req).list(req.user.id, {
        cursor,
        limit: Number(limit) || 20,
        unreadOnly: unread === 'true',
        type: type as NotificationType | undefined
      })

      res.setHeader("Cache-Control", 'no-store')
      res.json(result)
    } catch (error) {
      Logger.error("List Notification error", error);
      sendError(res, error)
    }
  },
  unreadCount: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AuthenticationError("User not authenticated")

      }

      const notificationService = getNotificationService(req);
      const unread = await notificationService.unreadCount(req.user.id);
      const unreadByType = await notificationService.unreadCountByType(req.user.id);
      res.setHeader("Cache-Control", "no-store");
      res.json({ unread, unreadByType })
    } catch (error) {
      Logger.error("Unread count error:", error);
      sendError(res, error);
    }
  },
  markRead: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        throw new AuthenticationError("User not authenticated")
      }

      const { ids, all } = (req.body ?? {}) as MarkReadBody;

      // Every id must be a string, so no object can reach the database query
      const hasValidIds =
        Array.isArray(ids) &&
        ids.length > 0 &&
        ids.length <= MAX_IDS_PER_REQUEST &&
        ids.every((notificationId) => typeof notificationId === "string");

      if (all !== true && !hasValidIds) {
        throw new ValidationError("Send { ids: [...] } or { all: true }");
      }

      const result = await getNotificationService(req).markRead(
        req.user.id,
        all === true ? "all" : (ids as string[]),
      );

      res.json(result);
    } catch (error) {
      Logger.error("Mark read error:", error);
      sendError(res, error);
    }
  }
}

export default NotificationController