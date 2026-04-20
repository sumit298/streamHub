import Redis from "ioredis";
import type { Logger } from "winston";
interface StreamStats {
    viewers: number;
    views: number;
    chatCount: number;
    [key: string]: unknown;
}
declare class CacheService {
    private logger;
    client: Redis | null;
    private publisher;
    private subscriber;
    constructor(logger: Logger);
    connect(): Promise<void>;
    setUserSession(userId: string, sessionData: Record<string, unknown>, ttl?: number): Promise<void>;
    getUserSession(userId: string): Promise<Record<string, unknown>>;
    deleteUserSession(userId: string): Promise<void>;
    getStream(streamId: string): Promise<Record<string, unknown> | null>;
    updateStream(streamId: string, streamData: Record<string, unknown>): Promise<void>;
    deleteStream(streamId: string): Promise<void>;
    addViewer(streamId: string, userId: string): Promise<number>;
    removeViewer(streamId: string, userId: string): Promise<number>;
    getViewers(streamId: string): Promise<string[]>;
    getViewerCount(streamId: string): Promise<number>;
    addChatMessage(streamId: string, message: Record<string, unknown>, maxMessage?: number): Promise<void>;
    getChatMessages(streamId: string, limit?: number): Promise<Array<Record<string, unknown>>>;
    incrementStreamView(streamId: string): Promise<void>;
    getStreamStats(streamId: string): Promise<StreamStats>;
    checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean>;
    subscribe(pattern: string, callback: (channel: string, data: unknown) => void): Promise<void>;
    publish(channel: string, data: unknown): Promise<void>;
    disconnect(): Promise<void>;
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
}
export default CacheService;
