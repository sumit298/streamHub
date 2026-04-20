import http from "http";
import https from "https";
import { Server as SocketIOServer } from "socket.io";
import type { Application } from "express";
import type { Logger } from "winston";
export interface ServerConfig {
    server: http.Server | https.Server;
    io: SocketIOServer;
}
export declare function createServer(app: Application, logger: Logger): ServerConfig;
