import type { Logger } from "winston";
export declare function connectDatabase(logger: Logger): Promise<void>;
/**
 * Disconnect from MongoDB
 */
export declare function disconnectDatabase(): Promise<void>;
