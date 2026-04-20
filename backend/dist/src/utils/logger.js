"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const Logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
        const reqId = requestId ? `[${requestId}] ` : "";
        return `${timestamp} [${level}] ${reqId}${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
    })),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston_1.default.transports.File({ filename: "logs/combined.log" }),
    ],
});
exports.default = Logger;
//# sourceMappingURL=logger.js.map