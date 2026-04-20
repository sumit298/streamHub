import type { Server as SocketIOServer } from "socket.io";
import type { Logger } from "winston";
import type MediaService from "../../services/MediaService";
import type StreamService from "../../services/StreamService";
import type { AuthenticatedSocket } from "../../types/socket.types";
interface Services {
    mediaService: MediaService;
    streamService: StreamService;
    logger: Logger;
}
interface ActiveConnection {
    userId: string;
    connectedAt: number;
}
export declare function registerStreamHandlers(socket: AuthenticatedSocket, services: Services, io: SocketIOServer, activeConnections: Map<string, ActiveConnection>): void;
export {};
