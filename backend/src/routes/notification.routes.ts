import express, { Router } from "express";
import AuthMiddleware from "@middleware/auth.middleware";
import NotificationController from "@controllers/notification.controller";

const router: Router = express.Router();

// GET /api/notifications - Get all notifications for authenticated user
router.get(
  "/",
  AuthMiddleware.authenticate,
  NotificationController.getAllNotifications,
);

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch(
  "/read-all",
  AuthMiddleware.authenticate,
  NotificationController.markAllAsRead,
);

// PATCH /api/notifications/:id/read - Mark specific notification as read
router.patch(
  "/:id/read",
  AuthMiddleware.authenticate,
  NotificationController.markAsRead,
);

export default router;
