import type { Server as SocketIOServer } from "socket.io";
import type { Logger } from "winston";
import MediaService from "../services/MediaService";
import MessageQueue from "../services/MessageQueue";
import CacheService from "../services/CacheService";
import StreamService from "../services/StreamService";
import ChatService from "../services/ChatService";
import R2Service from "../services/R2Service";
export interface Services {
    mediaService: MediaService;
    messageQueue: MessageQueue;
    cacheService: CacheService;
    streamService: StreamService;
    chatService: ChatService;
    r2Service: R2Service;
}
export declare function initializeServices(io: SocketIOServer, logger: Logger): Promise<Services>;
