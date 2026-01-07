const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(
      ({ timestamp, level, message, requestId, ...meta }) => {
        const reqId = requestId ? `[${requestId}] ` : "";
        return `${timestamp} [${level}] ${reqId}${message} ${
          Object.keys(meta).length ? JSON.stringify(meta) : ""
        }`;
      }
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

module.exports = logger;
