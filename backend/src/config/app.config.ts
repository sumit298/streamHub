import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import requestMiddleware from "@middleware/requestId.middleware";
import { specs, swaggerUi } from "../../swagger";
import followRoutes from "../routes/follow.routes";
import { requireCustomHeader } from "@middleware/csrf.middleware";

/**
 * Create and configure Express application
 */
export function createExpressApp(): express.Application {
  const app = express();

  // Trust proxy for Vercel/reverse proxies
  app.set('trust proxy', 1);

  // Security middleware
  if (process.env.NODE_ENV !== "test") {
    app.use(helmet());
  }

  // CORS configuration
  app.use(
    cors({
      origin:
        process.env.CORS_ORIGIN ||
        process.env.CLIENT_URL ||
        "http://localhost:3000",
      credentials: true,
    }),
  );

  // Request middleware
  app.use(requestMiddleware);
  app.use(morgan("dev"));
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  // app.use("/api", requireCustomHeader);

  // Rate limiters
  const generateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    message: "Too many requests from this ip",
    skip: (req) => {
      return req.path === "/auth/me" || req.path === "/auth/refresh-token";
    },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: "Too many authentication requests",
    skip: (req) => {
      return (
        req.path === "/me" ||
        req.path === "/me/stats" ||
        req.path === "/refresh-token"
      );
    },
  });

  app.use("/api", generateLimiter);
  app.use("/api/auth", authLimiter);
  app.use("/api/users", followRoutes);

  // Swagger Documentation
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "ILS API Documentation",
    }),
  );

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
