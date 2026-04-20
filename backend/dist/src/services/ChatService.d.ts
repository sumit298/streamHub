import type { Logger } from "winston";
import type MessageQueue from "./MessageQueue";
import type CacheService from "./CacheService";
interface MessageData {
    id: string;
    userId: string;
    username: string;
    avatar?: string;
    streamId: string;
    mentions: string[];
    content: string;
    type: string;
    timestamp: string;
    edited: boolean;
    deleted: boolean;
    reactions: Record<string, unknown>;
    [key: string]: unknown;
}
declare class ChatService {
    private messageQueue;
    cacheService: CacheService;
    private logger;
    private messageTypes;
    constructor(messageQueue: MessageQueue, cacheService: CacheService, logger: Logger);
    sendMessage(userId: string, streamId: string, content: string, type?: string, username?: string | null): Promise<MessageData>;
    getMessages(streamId: string, limit?: number, before?: string | null): Promise<any[]>;
    deleteMessage(messageId: string, userId: string, isModeratorOrOwner?: boolean): Promise<boolean>;
    addReaction(messageId: string, userId: string, emoji: string): Promise<any>;
    moderateMessage(messageId: string, action: string, moderatorId: string, reason?: string): Promise<any>;
    isUserTimedOut(userId: string): Promise<boolean>;
    getChatStats(streamId: string): Promise<any>;
    isMessageOwner(messageId: string, userId: string): Promise<boolean>;
    flagMessage(messageId: string, userId: string, reason: string, details?: string): Promise<any>;
}
export default ChatService;
