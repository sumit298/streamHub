import type { Logger } from "winston";
export interface RedisConfig {
    url: string;
    maxRetriesPerRequest: number;
    enableReadyCheck: boolean;
    retryStrategy: (times: number) => number | void;
}
export declare function getRedisConfig(logger: Logger): RedisConfig;
