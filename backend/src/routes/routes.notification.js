const express = require("express");
const NotificationController = require("../controllers/notification.controller");

const NotificationRouter = express.Router();

NotificationRouter.get("/", NotificationController.getAllNotifications);
NotificationRouter.patch("/:id/read", NotificationController.markAsRead);
NotificationRouter.patch("/read-all", NotificationController.markAllAsRead);

module.exports = NotificationRouter;
