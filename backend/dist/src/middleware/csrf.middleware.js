"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCustomHeader = void 0;
const requireCustomHeader = (req, res, next) => {
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
exports.requireCustomHeader = requireCustomHeader;
//# sourceMappingURL=csrf.middleware.js.map