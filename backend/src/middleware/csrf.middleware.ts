// backend/src/middleware/csrf.middleware.ts (NEW FILE)
import { Request, Response, NextFunction } from 'express';

export const requireCustomHeader = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Check for custom header
  const customHeader = req.headers['x-requested-with'];
  if (customHeader !== 'XMLHttpRequest') {
    res.status(403).json({
      success: false,
      error: {
        message: 'Forbidden',
        code: 'CSRF_VALIDATION_FAILED',
        statusCode: 403,
      },
    });
    return;
  }

  next();
};
