const express = require("express");
const NotificationController = require("../controllers/notification.controller");
const { authenticate } = require("../middleware/middleware.auth");



const NotificationRouter = express.Router();

NotificationRouter.get("/", authenticate, NotificationController.getAllNotifications);
NotificationRouter.patch("/:id/read", authenticate, NotificationController.markAsRead);
NotificationRouter.patch("/read-all", authenticate, NotificationController.markAllAsRead);

module.exports = NotificationRouter;
