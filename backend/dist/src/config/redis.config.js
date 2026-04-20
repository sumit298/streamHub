"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisConfig = getRedisConfig;
function getRedisConfig(logger) {
    return {
        url: process.env.REDIS_URL || "redis://localhost:6379",
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy: (times) => {
            if (times > 3) {
                logger.warn("Redis connection failed after 3 retries");
                return undefined;
            }
            return Math.min(times * 100, 3000);
        },
    };
}
//# sourceMappingURL=redis.config.js.map