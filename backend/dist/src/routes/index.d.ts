import { Application } from "express";
import type StreamService from "../services/StreamService";
import type ChatService from "../services/ChatService";
import type CacheService from "../services/CacheService";
import type R2Service from "../services/R2Service";
interface RegisterRoutesOptions {
    streamService: StreamService;
    chatService: ChatService;
    cacheService: CacheService;
    r2Service: R2Service;
}
export declare const registerRoutes: (app: Application, services: RegisterRoutesOptions) => void;
export {};
