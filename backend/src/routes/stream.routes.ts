import express from "express";
import { body, param, query, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import AuthMiddleware from "@middleware/auth.middleware";
import StreamController from "@controllers/stream.controller";
import type StreamService from "@services/StreamService";
import type CacheService from "@services/CacheService";

export default (streamService: StreamService, cacheService: CacheService) => {
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

  // Rate limiting for stream operations
  const streamCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
      error: "Too many streams created. Please wait before creating another.",
    },
    keyGenerator: (req: express.Request) => (req as any).userId,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const streamQueryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: "Too many requests. Please slow down." },
  });

  // Validation rules
  const createStreamValidation = [
    body("title")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Title must be between 1 and 100 characters")
      .escape(),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description must be less than 1000 characters")
      .escape(),
    body("category")
      .optional()
      .isIn([
        "gaming",
        "music",
        "art",
        "technology",
        "education",
        "entertainment",
        "sports",
        "general",
        "talk shows",
      ])
      .withMessage("Invalid category"),
    body("isPrivate")
      .optional()
      .isBoolean()
      .withMessage("isPrivate must be a boolean"),
    body("chatEnabled")
      .optional()
      .isBoolean()
      .withMessage("chatEnabled must be a boolean"),
    body("recordingEnabled")
      .optional()
      .isBoolean()
      .withMessage("recordingEnabled must be a boolean"),
    body("tags")
      .optional()
      .isArray({ max: 10 })
      .withMessage("Maximum 10 tags allowed"),
    body("tags.*")
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage("Each tag must be between 1 and 30 characters"),
    handleValidationErrors,
  ];

  const updateStreamValidation = [
    param("id").notEmpty().withMessage("Stream ID is required"),
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Title must be between 1 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description must be less than 1000 characters"),
    body("category")
      .optional()
      .isIn([
        "gaming",
        "music",
        "art",
        "technology",
        "education",
        "entertainment",
        "sports",
        "general",
      ])
      .withMessage("Invalid category"),
    handleValidationErrors,
  ];

  const getStreamsValidation = [
    query("category")
      .optional()
      .isIn([
        "gaming",
        "music",
        "art",
        "technology",
        "education",
        "entertainment",
        "sports",
        "general",
      ]),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Offset must be non-negative"),
    query("search")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Search query must be between 2 and 100 characters"),
    query("sortBy")
      .optional()
      .isIn(["viewers", "created", "title"])
      .withMessage("Invalid sort parameter"),
    query("filter")
      .optional()
      .isIn(["my", "community"])
      .withMessage("Invalid filter parameter"),
    handleValidationErrors,
  ];

  const streamIdValidation = [
    param("id").notEmpty().withMessage("Stream ID is required"),
    handleValidationErrors,
  ];

  const getUserStreamsValidation = [
    param("userId").isMongoId().withMessage("Invalid user ID"),
    query("includeEnded")
      .optional()
      .isBoolean()
      .withMessage("includeEnded must be boolean"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    handleValidationErrors,
  ];

  // Routes - Direct controller method calls with service injection
  
  // GET /api/streams - Get all active streams with filtering
  router.get(
    "/",
    AuthMiddleware.authenticate,
    streamQueryLimiter,
    getStreamsValidation,
    StreamController.getStreams(streamService, cacheService)
  );

  // POST /api/streams - Create a new stream
  router.post(
    "/",
    AuthMiddleware.authenticate,
    streamCreateLimiter,
    createStreamValidation,
    StreamController.createStream(streamService, cacheService)
  );

  // GET /api/streams/:id - Get specific stream details
  router.get(
    "/:id",
    AuthMiddleware.authenticate,
    streamQueryLimiter,
    streamIdValidation,
    StreamController.getStreamById(streamService, cacheService)
  );

  // POST /api/streams/:id/end - End the stream
  router.post(
    "/:id/end",
    AuthMiddleware.authenticate,
    streamIdValidation,
    StreamController.endStream(streamService, cacheService)
  );

  // PATCH /api/streams/:id - Update stream details
  router.patch(
    "/:id",
    AuthMiddleware.authenticate,
    updateStreamValidation,
    StreamController.updateStream(streamService, cacheService)
  );

  // DELETE /api/streams/:id - Delete a stream
  router.delete(
    "/:id",
    AuthMiddleware.authenticate,
    streamIdValidation,
    StreamController.deleteStream(streamService, cacheService)
  );

  // POST /api/streams/:id/join - Join a stream
  router.post(
    "/:id/join",
    AuthMiddleware.authenticate,
    streamQueryLimiter,
    streamIdValidation,
    StreamController.joinStream(streamService)
  );

  // GET /api/streams/:id/viewers - Get active viewers in stream
  router.get(
    "/:id/viewers",
    AuthMiddleware.authenticate,
    streamQueryLimiter,
    streamIdValidation,
    StreamController.getViewers()
  );

  // GET /api/streams/:id/stats - Get stream analytics
  router.get(
    "/:id/stats",
    AuthMiddleware.authenticate,
    streamQueryLimiter,
    streamIdValidation,
    StreamController.getStreamStats(streamService)
  );

  // GET /api/streams/user/:userId - Get streams by user
  router.get(
    "/user/:userId",
    AuthMiddleware.authenticate,
    streamQueryLimiter,
    getUserStreamsValidation,
    StreamController.getUserStreams(streamService)
  );

  return router;
};
