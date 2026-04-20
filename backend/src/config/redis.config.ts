import type { Logger } from "winston";

export interface RedisConfig {
  url: string;
  maxRetriesPerRequest: number;
  enableReadyCheck: boolean;
  retryStrategy: (times: number) => number | void;
}

export function getRedisConfig(logger: Logger): RedisConfig {
  return {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times: number) => {
      if (times > 3) {
        logger.warn("Redis connection failed after 3 retries");
        return undefined;
      }
      return Math.min(times * 100, 3000);
    },
  };
}
