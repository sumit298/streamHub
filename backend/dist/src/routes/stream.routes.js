"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_middleware_1 = __importDefault(require("../middleware/auth.middleware"));
const stream_controller_1 = __importDefault(require("../controllers/stream.controller"));
exports.default = (streamService, cacheService) => {
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
    // Rate limiting for stream operations
    const streamCreateLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5,
        message: {
            error: "Too many streams created. Please wait before creating another.",
        },
        keyGenerator: (req) => req.userId,
        standardHeaders: true,
        legacyHeaders: false,
    });
    const streamQueryLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: { error: "Too many requests. Please slow down." },
    });
    // Validation rules
    const createStreamValidation = [
        (0, express_validator_1.body)("title")
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage("Title must be between 1 and 100 characters")
            .escape(),
        (0, express_validator_1.body)("description")
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage("Description must be less than 1000 characters")
            .escape(),
        (0, express_validator_1.body)("category")
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
        (0, express_validator_1.body)("isPrivate")
            .optional()
            .isBoolean()
            .withMessage("isPrivate must be a boolean"),
        (0, express_validator_1.body)("chatEnabled")
            .optional()
            .isBoolean()
            .withMessage("chatEnabled must be a boolean"),
        (0, express_validator_1.body)("recordingEnabled")
            .optional()
            .isBoolean()
            .withMessage("recordingEnabled must be a boolean"),
        (0, express_validator_1.body)("tags")
            .optional()
            .isArray({ max: 10 })
            .withMessage("Maximum 10 tags allowed"),
        (0, express_validator_1.body)("tags.*")
            .optional()
            .trim()
            .isLength({ min: 1, max: 30 })
            .withMessage("Each tag must be between 1 and 30 characters"),
        handleValidationErrors,
    ];
    const updateStreamValidation = [
        (0, express_validator_1.param)("id").notEmpty().withMessage("Stream ID is required"),
        (0, express_validator_1.body)("title")
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage("Title must be between 1 and 100 characters"),
        (0, express_validator_1.body)("description")
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage("Description must be less than 1000 characters"),
        (0, express_validator_1.body)("category")
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
        (0, express_validator_1.query)("category")
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
        (0, express_validator_1.query)("limit")
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage("Limit must be between 1 and 50"),
        (0, express_validator_1.query)("offset")
            .optional()
            .isInt({ min: 0 })
            .withMessage("Offset must be non-negative"),
        (0, express_validator_1.query)("search")
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage("Search query must be between 2 and 100 characters"),
        (0, express_validator_1.query)("sortBy")
            .optional()
            .isIn(["viewers", "created", "title"])
            .withMessage("Invalid sort parameter"),
        (0, express_validator_1.query)("filter")
            .optional()
            .isIn(["my", "community"])
            .withMessage("Invalid filter parameter"),
        handleValidationErrors,
    ];
    const streamIdValidation = [
        (0, express_validator_1.param)("id").notEmpty().withMessage("Stream ID is required"),
        handleValidationErrors,
    ];
    const getUserStreamsValidation = [
        (0, express_validator_1.param)("userId").isMongoId().withMessage("Invalid user ID"),
        (0, express_validator_1.query)("includeEnded")
            .optional()
            .isBoolean()
            .withMessage("includeEnded must be boolean"),
        (0, express_validator_1.query)("limit")
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage("Limit must be between 1 and 50"),
        handleValidationErrors,
    ];
    // Routes - Direct controller method calls with service injection
    // GET /api/streams - Get all active streams with filtering
    router.get("/", auth_middleware_1.default.authenticate, streamQueryLimiter, getStreamsValidation, stream_controller_1.default.getStreams(streamService, cacheService));
    // POST /api/streams - Create a new stream
    router.post("/", auth_middleware_1.default.authenticate, streamCreateLimiter, createStreamValidation, stream_controller_1.default.createStream(streamService, cacheService));
    // GET /api/streams/:id - Get specific stream details
    router.get("/:id", auth_middleware_1.default.authenticate, streamQueryLimiter, streamIdValidation, stream_controller_1.default.getStreamById(streamService, cacheService));
    // POST /api/streams/:id/end - End the stream
    router.post("/:id/end", auth_middleware_1.default.authenticate, streamIdValidation, stream_controller_1.default.endStream(streamService, cacheService));
    // PATCH /api/streams/:id - Update stream details
    router.patch("/:id", auth_middleware_1.default.authenticate, updateStreamValidation, stream_controller_1.default.updateStream(streamService, cacheService));
    // DELETE /api/streams/:id - Delete a stream
    router.delete("/:id", auth_middleware_1.default.authenticate, streamIdValidation, stream_controller_1.default.deleteStream(streamService, cacheService));
    // POST /api/streams/:id/join - Join a stream
    router.post("/:id/join", auth_middleware_1.default.authenticate, streamQueryLimiter, streamIdValidation, stream_controller_1.default.joinStream(streamService));
    // GET /api/streams/:id/viewers - Get active viewers in stream
    router.get("/:id/viewers", auth_middleware_1.default.authenticate, streamQueryLimiter, streamIdValidation, stream_controller_1.default.getViewers());
    // GET /api/streams/:id/stats - Get stream analytics
    router.get("/:id/stats", auth_middleware_1.default.authenticate, streamQueryLimiter, streamIdValidation, stream_controller_1.default.getStreamStats(streamService));
    // GET /api/streams/user/:userId - Get streams by user
    router.get("/user/:userId", auth_middleware_1.default.authenticate, streamQueryLimiter, getUserStreamsValidation, stream_controller_1.default.getUserStreams(streamService));
    return router;
};
//# sourceMappingURL=stream.routes.js.map