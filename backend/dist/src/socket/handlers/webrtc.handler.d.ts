import type { Logger } from "winston";
import type MediaService from "../../services/MediaService";
import type StreamService from "../../services/StreamService";
import type { AuthenticatedSocket } from "../../types/socket.types";
interface Services {
    mediaService: MediaService;
    streamService: StreamService;
    logger: Logger;
}
export declare function registerWebRTCHandlers(socket: AuthenticatedSocket, services: Services): void;
export {};
