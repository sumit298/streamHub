import { detectAndSetIP } from "./src/utils/ipDetection";
import { createExpressApp } from "./src/config/app.config";
import { createServer } from "./src/config/server.config";
import { initializeServices } from "./src/config/services.config";
import { registerRoutes } from "./src/routes/index";
import { registerShutdownHandler } from "./src/utils/shutdown.handler";
import { initializeSocketHandlers } from "./src/socket/socket.server";
import { normalizeError } from "./src/types/error.types";
import logger from "./src/utils/logger";

// Auto-detect IP for development
detectAndSetIP();

// Create Express app with all middleware
const app = createExpressApp();

// Create HTTP/HTTPS server and Socket.IO
const { server, io } = createServer(app, logger);

// Start server
async function startServer() {
  try {
    // Initialize all services (DB, Redis, MediaSoup, etc.)
    const services = await initializeServices(io, logger);

    // Register all API routes
    registerRoutes(app, services);

    // Initialize Socket.IO handlers
    initializeSocketHandlers(io, services);

    // Register graceful shutdown handler
    registerShutdownHandler(server, io, services, logger);

    // Global error handler (must be last)
    app.use((err: unknown, req: any, res: any, next: any) => {
      const normalizedError = normalizeError(err);

      logger.error(normalizedError.message, {
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
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
