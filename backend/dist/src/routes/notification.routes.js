"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = __importDefault(require("../middleware/auth.middleware"));
const notification_controller_1 = __importDefault(require("../controllers/notification.controller"));
const router = express_1.default.Router();
// GET /api/notifications - Get all notifications for authenticated user
router.get("/", auth_middleware_1.default.authenticate, notification_controller_1.default.getAllNotifications);
// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch("/read-all", auth_middleware_1.default.authenticate, notification_controller_1.default.markAllAsRead);
// PATCH /api/notifications/:id/read - Mark specific notification as read
router.patch("/:id/read", auth_middleware_1.default.authenticate, notification_controller_1.default.markAsRead);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map