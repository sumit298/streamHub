"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_middleware_1 = __importDefault(require("../middleware/auth.middleware"));
const chat_controller_1 = __importDefault(require("../controllers/chat.controller"));
exports.default = (chatService) => {
    const router = express_1.default.Router();
    // Validation error handler
    const handleValidationErrors = (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            const formattedErrors = {};
            errors.array().forEach((error) => {
                if (error.type === "field") {
                    formattedErrors[error.path] = error.msg;
                }
            });
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: formattedErrors,
            });
        }
        next();
    };
    // Rate limiting
    const chatLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 30,
        message: { error: "Too many messages. Please slow down." },
        keyGenerator: (req) => req.userId || req.ip,
        standardHeaders: true,
        legacyHeaders: false,
    });
    const chatQueryLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 200,
        message: { error: "Too many requests. Please slow down." },
    });
    // Validations
    const sendMessageValidation = [
        (0, express_validator_1.param)("streamId").notEmpty().withMessage("Stream ID is required"),
        (0, express_validator_1.body)("content")
            .trim()
            .isLength({ min: 1, max: 500 })
            .withMessage("Message content must be between 1 and 500 characters"),
        (0, express_validator_1.body)("type")
            .optional()
            .isIn(["text", "emoji", "gif", "sticker"])
            .withMessage("Invalid message type"),
        (0, express_validator_1.body)("responseToMessageId")
            .optional()
            .isUUID()
            .withMessage("Invalid message ID for response"),
        handleValidationErrors,
    ];
    const getMessagesValidation = [
        (0, express_validator_1.param)("streamId").notEmpty().withMessage("Stream ID is required"),
        (0, express_validator_1.query)("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("Limit must be between 1 and 100"),
        (0, express_validator_1.query)("before")
            .optional()
            .isISO8601()
            .withMessage("Invalid date format for before parameter"),
        handleValidationErrors,
    ];
    const deleteMessageValidation = [
        (0, express_validator_1.param)("streamId").notEmpty().withMessage("Stream ID is required"),
        (0, express_validator_1.param)("messageId").isUUID().withMessage("Invalid message ID"),
        handleValidationErrors,
    ];
    const addReactionValidation = [
        (0, express_validator_1.param)("streamId").notEmpty().withMessage("Stream ID is required"),
        (0, express_validator_1.param)("messageId").isUUID().withMessage("Invalid message ID"),
        (0, express_validator_1.body)("emoji")
            .trim()
            .isLength({ min: 1, max: 10 })
            .withMessage("Emoji must be between 1 and 10 characters"),
        handleValidationErrors,
    ];
    const moderationValidation = [
        (0, express_validator_1.param)("streamId").notEmpty().withMessage("Stream ID is required"),
        (0, express_validator_1.param)("messageId").isUUID().withMessage("Invalid message ID"),
        (0, express_validator_1.body)("action")
            .isIn(["delete", "timeout", "warn"])
            .withMessage("Invalid moderation action"),
        (0, express_validator_1.body)("reason")
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage("Reason must be less than 200 characters"),
        handleValidationErrors,
    ];
    const getChatStatsValidation = [
        (0, express_validator_1.param)("streamId").notEmpty().withMessage("Stream ID is required"),
        handleValidationErrors,
    ];
    const flagMessageValidation = [
        (0, express_validator_1.param)("streamId").notEmpty().withMessage("Stream ID is required"),
        (0, express_validator_1.param)("messageId").isUUID().withMessage("Invalid message ID"),
        (0, express_validator_1.body)("reason")
            .isIn(["spam", "inappropriate", "harassment", "off-topic", "other"])
            .withMessage("Invalid flag reason"),
        (0, express_validator_1.body)("details")
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage("Details must be less than 200 characters"),
        handleValidationErrors,
    ];
    // Routes
    // Public (optional)
    router.get("/:streamId", chatQueryLimiter, getMessagesValidation, chat_controller_1.default.getMessages(chatService));
    // Send message (auth required)
    router.post("/:streamId", auth_middleware_1.default.authenticate, chatLimiter, sendMessageValidation, chat_controller_1.default.sendMessage(chatService));
    // Delete message
    router.delete("/:streamId/:messageId", auth_middleware_1.default.authenticate, deleteMessageValidation, chat_controller_1.default.deleteMessage(chatService));
    // Add reaction
    router.post("/:streamId/:messageId/react", auth_middleware_1.default.authenticate, addReactionValidation, chat_controller_1.default.addReaction(chatService));
    // Moderate message (restricted)
    router.post("/:streamId/:messageId/moderate", auth_middleware_1.default.authenticate, auth_middleware_1.default.requiredRoles(["moderator", "admin"]), moderationValidation, chat_controller_1.default.moderateMessage(chatService));
    // Stats
    router.get("/:streamId/stats", auth_middleware_1.default.authenticate, chatQueryLimiter, getChatStatsValidation, chat_controller_1.default.getChatStats(chatService));
    // Flag message
    router.post("/:streamId/:messageId/flag", auth_middleware_1.default.authenticate, flagMessageValidation, chat_controller_1.default.flagMessage(chatService));
    return router;
};
//# sourceMappingURL=chat.routes.js.map