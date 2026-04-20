import type { Server as SocketIOServer } from "socket.io";
import type { Logger } from "winston";
import type R2Service from "../../services/R2Service";
import type MessageQueue from "../../services/MessageQueue";
import type { AuthenticatedSocket } from "../../types/socket.types";
import fs from "fs";
interface Services {
    r2Service: R2Service;
    messageQueue: MessageQueue;
    logger: Logger;
}
export declare function registerRecordingHandlers(socket: AuthenticatedSocket, services: Services, recordingStreams: Map<string, fs.WriteStream>, io: SocketIOServer): void;
export {};
