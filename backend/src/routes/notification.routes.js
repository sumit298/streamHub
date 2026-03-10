const express = require("express");
const NotificationController = require("../controllers/notification.controller");
const { authenticate } = require("../middleware/middleware.auth");



const NotificationRouter = express.Router();

NotificationRouter.get("/", authenticate, NotificationController.getAllNotifications);
NotificationRouter.patch("/read-all", authenticate, NotificationController.markAllAsRead);
NotificationRouter.patch("/:id/read", authenticate, NotificationController.markAsRead);

module.exports = NotificationRouter;
