import type { Server } from "http";
import type { Server as SocketIOServer } from "socket.io";
import type { Logger } from "winston";
import type { Services } from "../config/services.config";
export declare function registerShutdownHandler(server: Server, io: SocketIOServer, services: Services, logger: Logger): void;
