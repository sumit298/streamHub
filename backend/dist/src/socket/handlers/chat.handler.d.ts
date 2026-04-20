import type { Server as SocketIOServer } from "socket.io";
import type { Logger } from "winston";
import ChatService from "../../services/ChatService";
import { AuthenticatedSocket } from "../../types/socket.types";
interface Services {
    chatService: ChatService;
    logger: Logger;
}
interface RateLimit {
    count: number;
    resetAt: number;
}
export declare function registerChatHandlers(socket: AuthenticatedSocket, services: Services, io: SocketIOServer, chatRateLimits: Map<string, RateLimit>): void;
export {};
