import { Request, Response, NextFunction } from "express";
import type MetricsService from "@services/MetricsService";

/**
 * Metrics Middleware - Track HTTP request metrics
 *
 * Tracks:
 * - Request duration
 * - Request count by route/method/status
 * - Error rates
 */
export function metricsMiddleware(metricsService: MetricsService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Capture response finish event
    res.on("finish", () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const route = getRoutePattern(req.route?.path || req.path);
      const method = req.method;
      const status = res.statusCode;

      // Record metrics
      metricsService.recordHttpRequest(method, route, status, duration);
    });

    next();
  };
}

/**
 * Extract route pattern for consistent labeling
 * Converts /api/streams/abc123 -> /api/streams/:id
 */
function getRoutePattern(path: string): string {
  // Replace UUIDs with :id
  let pattern = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ":id",
  );

  // Replace MongoDB ObjectIDs with :id
  pattern = pattern.replace(/[0-9a-f]{24}/gi, ":id");

  // Replace numeric IDs with :id
  pattern = pattern.replace(/\/\d+/g, "/:id");

  return pattern || "/";
}
