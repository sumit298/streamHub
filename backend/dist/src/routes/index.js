"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = void 0;
const auth_middleware_1 = __importDefault(require("../middleware/auth.middleware"));
const auth_routes_1 = __importDefault(require("./auth.routes"));
const stream_routes_1 = __importDefault(require("./stream.routes"));
const chat_routes_1 = __importDefault(require("./chat.routes"));
const follow_routes_1 = __importDefault(require("./follow.routes"));
const notification_routes_1 = __importDefault(require("./notification.routes"));
const vod_routes_1 = __importDefault(require("./vod.routes"));
const logger_1 = __importDefault(require("../utils/logger"));
const registerRoutes = (app, services) => {
    const { streamService, chatService, cacheService, r2Service } = services;
    // Auth routes with service injection
    app.use("/api/auth", (req, res, next) => {
        req.r2Service = r2Service;
        req.cacheService = cacheService;
        next();
    }, auth_routes_1.default);
    // Stream routes
    app.use("/api/streams", (0, stream_routes_1.default)(streamService, cacheService));
    // Chat routes
    app.use("/api/chat", auth_middleware_1.default.authenticate, (0, chat_routes_1.default)(chatService));
    // Follow routes
    app.use("/api/users", follow_routes_1.default);
    // Notification routes
    app.use("/api/notifications", auth_middleware_1.default.authenticate, notification_routes_1.default);
    // VOD routes with service injection
    app.use("/api/vods", (req, res, next) => {
        req.r2Service = r2Service;
        req.logger = logger_1.default;
        next();
    }, vod_routes_1.default);
    logger_1.default.info("All routes registered successfully");
};
exports.registerRoutes = registerRoutes;
//# sourceMappingURL=index.js.map