"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ipDetection_1 = require("./src/utils/ipDetection");
const app_config_1 = require("./src/config/app.config");
const server_config_1 = require("./src/config/server.config");
const services_config_1 = require("./src/config/services.config");
const index_1 = require("./src/routes/index");
const shutdown_handler_1 = require("./src/utils/shutdown.handler");
const socket_server_1 = require("./src/socket/socket.server");
const error_types_1 = require("./src/types/error.types");
const logger_1 = __importDefault(require("./src/utils/logger"));
// Auto-detect IP for development
(0, ipDetection_1.detectAndSetIP)();
// Create Express app with all middleware
const app = (0, app_config_1.createExpressApp)();
// Create HTTP/HTTPS server and Socket.IO
const { server, io } = (0, server_config_1.createServer)(app, logger_1.default);
// Start server
async function startServer() {
    try {
        // Initialize all services (DB, Redis, MediaSoup, etc.)
        const services = await (0, services_config_1.initializeServices)(io, logger_1.default);
        // Register all API routes
        (0, index_1.registerRoutes)(app, services);
        // Initialize Socket.IO handlers
        (0, socket_server_1.initializeSocketHandlers)(io, services);
        // Register graceful shutdown handler
        (0, shutdown_handler_1.registerShutdownHandler)(server, io, services, logger_1.default);
        // Global error handler (must be last)
        app.use((err, req, res, next) => {
            const normalizedError = (0, error_types_1.normalizeError)(err);
            logger_1.default.error(normalizedError.message, {
                requestId: req.requestId,
                stack: normalizedError.stack,
                code: normalizedError.code,
            });
            res.status(normalizedError.statusCode).json({
                error: normalizedError.message,
                code: normalizedError.code,
                requestId: req.requestId,
            });
        });
        // Start listening
        const PORT = process.env.PORT || 3001;
        server.listen(PORT, () => {
            logger_1.default.info(`Server running on port ${PORT}`);
        });
    }
    catch (error) {
        logger_1.default.error("Failed to start server:", error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map