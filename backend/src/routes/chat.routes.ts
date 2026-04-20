import express from "express";
import { body, param, query, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import AuthMiddleware from "@middleware/auth.middleware";
import ChatController from "@controllers/chat.controller";
import type ChatService from "@services/ChatService";

export default (chatService: ChatService) => {
  const router = express.Router();

  // Validation error handler
  const handleValidationErrors = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors: Record<string, string> = {};
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
  const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: "Too many messages. Please slow down." },
    keyGenerator: (req: any) => req.userId || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const chatQueryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: "Too many requests. Please slow down." },
  });

  // Validations
  const sendMessageValidation = [
    param("streamId").notEmpty().withMessage("Stream ID is required"),
    body("content")
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Message content must be between 1 and 500 characters"),
    body("type")
      .optional()
      .isIn(["text", "emoji", "gif", "sticker"])
      .withMessage("Invalid message type"),
    body("responseToMessageId")
      .optional()
      .isUUID()
      .withMessage("Invalid message ID for response"),
    handleValidationErrors,
  ];

  const getMessagesValidation = [
    param("streamId").notEmpty().withMessage("Stream ID is required"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("before")
      .optional()
      .isISO8601()
      .withMessage("Invalid date format for before parameter"),
    handleValidationErrors,
  ];

  const deleteMessageValidation = [
    param("streamId").notEmpty().withMessage("Stream ID is required"),
    param("messageId").isUUID().withMessage("Invalid message ID"),
    handleValidationErrors,
  ];

  const addReactionValidation = [
    param("streamId").notEmpty().withMessage("Stream ID is required"),
    param("messageId").isUUID().withMessage("Invalid message ID"),
    body("emoji")
      .trim()
      .isLength({ min: 1, max: 10 })
      .withMessage("Emoji must be between 1 and 10 characters"),
    handleValidationErrors,
  ];

  const moderationValidation = [
    param("streamId").notEmpty().withMessage("Stream ID is required"),
    param("messageId").isUUID().withMessage("Invalid message ID"),
    body("action")
      .isIn(["delete", "timeout", "warn"])
      .withMessage("Invalid moderation action"),
    body("reason")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Reason must be less than 200 characters"),
    handleValidationErrors,
  ];

  const getChatStatsValidation = [
    param("streamId").notEmpty().withMessage("Stream ID is required"),
    handleValidationErrors,
  ];

  const flagMessageValidation = [
    param("streamId").notEmpty().withMessage("Stream ID is required"),
    param("messageId").isUUID().withMessage("Invalid message ID"),
    body("reason")
      .isIn(["spam", "inappropriate", "harassment", "off-topic", "other"])
      .withMessage("Invalid flag reason"),
    body("details")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Details must be less than 200 characters"),
    handleValidationErrors,
  ];

  // Routes

  // Public (optional)
  router.get(
    "/:streamId",
    chatQueryLimiter,
    getMessagesValidation,
    ChatController.getMessages(chatService),
  );

  // Send message (auth required)
  router.post(
    "/:streamId",
    AuthMiddleware.authenticate,
    chatLimiter,
    sendMessageValidation,
    ChatController.sendMessage(chatService),
  );

  // Delete message
  router.delete(
    "/:streamId/:messageId",
    AuthMiddleware.authenticate,
    deleteMessageValidation,
    ChatController.deleteMessage(chatService),
  );

  // Add reaction
  router.post(
    "/:streamId/:messageId/react",
    AuthMiddleware.authenticate,
    addReactionValidation,
    ChatController.addReaction(chatService),
  );

  // Moderate message (restricted)
  router.post(
    "/:streamId/:messageId/moderate",
    AuthMiddleware.authenticate,
    AuthMiddleware.requiredRoles(["moderator", "admin"]),
    moderationValidation,
    ChatController.moderateMessage(chatService),
  );

  // Stats
  router.get(
    "/:streamId/stats",
    AuthMiddleware.authenticate,
    chatQueryLimiter,
    getChatStatsValidation,
    ChatController.getChatStats(chatService),
  );

  // Flag message
  router.post(
    "/:streamId/:messageId/flag",
    AuthMiddleware.authenticate,
    flagMessageValidation,
    ChatController.flagMessage(chatService),
  );

  return router;
};