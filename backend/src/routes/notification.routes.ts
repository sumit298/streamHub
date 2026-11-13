import express, { Router } from "express";
import AuthMiddleware from "@middleware/auth.middleware";
import NotificationController from "@controllers/notification.controller";

const router: Router = express.Router();

// GET /api/notifications - one page of the user's notifications
router.get(
  "/",
  AuthMiddleware.authenticate,
  NotificationController.list,
);

// GET /api/notifications/unread-count - number for the bell badge
router.get(
  "/unread-count",
  AuthMiddleware.authenticate,
  NotificationController.unreadCount,
);

// PATCH /api/notifications/read - mark some or all as read
router.patch(
  "/read",
  AuthMiddleware.authenticate,
  NotificationController.markRead,
);

export default router;
