import { Server as SocketIOServer } from 'socket.io';
import type MediaService from '../services/MediaService';
import type StreamService from '../services/StreamService';
import type ChatService from '../services/ChatService';
import type R2Service from '../services/R2Service';
import type MessageQueue from '../services/MessageQueue';
interface Services {
    mediaService: MediaService;
    streamService: StreamService;
    chatService: ChatService;
    r2Service: R2Service;
    messageQueue: MessageQueue;
}
export declare function initializeSocketHandlers(io: SocketIOServer, services: Services): void;
export {};
