"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExpressApp = createExpressApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const requestId_middleware_1 = __importDefault(require("../middleware/requestId.middleware"));
const swagger_1 = require("../../swagger");
const follow_routes_1 = __importDefault(require("../routes/follow.routes"));
/**
 * Create and configure Express application
 */
function createExpressApp() {
    const app = (0, express_1.default)();
    // Trust proxy for Vercel/reverse proxies
    app.set('trust proxy', 1);
    // Security middleware
    if (process.env.NODE_ENV !== "test") {
        app.use((0, helmet_1.default)());
    }
    // CORS configuration
    app.use((0, cors_1.default)({
        origin: process.env.CORS_ORIGIN ||
            process.env.CLIENT_URL ||
            "http://localhost:3000",
        credentials: true,
    }));
    // Request middleware
    app.use(requestId_middleware_1.default);
    app.use((0, morgan_1.default)("dev"));
    app.use(express_1.default.json({ limit: "10mb" }));
    app.use((0, cookie_parser_1.default)());
    // app.use("/api", requireCustomHeader);
    // Rate limiters
    const generateLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 10000,
        message: "Too many requests from this ip",
        skip: (req) => {
            return req.path === "/auth/me" || req.path === "/auth/refresh-token";
        },
    });
    const authLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 200,
        message: "Too many authentication requests",
        skip: (req) => {
            return (req.path === "/me" ||
                req.path === "/me/stats" ||
                req.path === "/refresh-token");
        },
    });
    app.use("/api", generateLimiter);
    app.use("/api/auth", authLimiter);
    app.use("/api/users", follow_routes_1.default);
    // Swagger Documentation
    app.use("/api-docs", swagger_1.swaggerUi.serve, swagger_1.swaggerUi.setup(swagger_1.specs, {
        explorer: true,
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "ILS API Documentation",
    }));
    // Health check endpoint
    app.get("/health", (req, res) => {
        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });
    return app;
}
//# sourceMappingURL=app.config.js.map