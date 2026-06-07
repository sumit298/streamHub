import { Request, Response, NextFunction } from 'express';
import MetricsService from '@services/MetricsService';

/**
 * Metrics Middleware - Track HTTP request metrics
 * 
 * Uses singleton instance, no need to pass service explicitly
 */
export function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const metricsService = MetricsService.getInstance();
    
    // Skip if metrics service not initialized
    if (!metricsService) {
      return next();
    }

    const startTime = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000;
      const route = getRoutePattern(req.route?.path || req.path);
      const method = req.method;
      const status = res.statusCode;

      metricsService.recordHttpRequest(method, route, status, duration);
    });

    next();
  };
}

/**
 * Extract route pattern for consistent labeling
 */
function getRoutePattern(path: string): string {
  let pattern = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id'
  );
  
  pattern = pattern.replace(/[0-9a-f]{24}/gi, ':id');
  pattern = pattern.replace(/\/\d+/g, '/:id');

  return pattern || '/';
}
