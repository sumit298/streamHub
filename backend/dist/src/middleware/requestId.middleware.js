"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const requestMiddleware = (req, res, next) => {
    req.requestId = (0, uuid_1.v4)();
    res.setHeader('X-Request-ID', req.requestId);
    next();
};
exports.default = requestMiddleware;
//# sourceMappingURL=requestId.middleware.js.map