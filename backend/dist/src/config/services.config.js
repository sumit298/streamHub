"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeServices = initializeServices;
const fs_1 = __importDefault(require("fs"));
const MediaService_1 = __importDefault(require("../services/MediaService"));
const MessageQueue_1 = __importDefault(require("../services/MessageQueue"));
const CacheService_1 = __importDefault(require("../services/CacheService"));
const StreamService_1 = __importDefault(require("../services/StreamService"));
const ChatService_1 = __importDefault(require("../services/ChatService"));
const R2Service_1 = __importDefault(require("../services/R2Service"));
const db_1 = require("./db");
async function initializeServices(io, logger) {
    try {
        logger.info("Initializing services...");
        await (0, db_1.connectDatabase)(logger);
        const mediaService = new MediaService_1.default(logger);
        await mediaService.initialize();
        const messageQueue = new MessageQueue_1.default(logger);
        if (process.env.NODE_ENV === "development") {
            try {
                await messageQueue.connect();
            }
            catch (error) {
                logger.warn("RabbitMQ unavailable, continuing without it");
            }
        }
        const cacheService = new CacheService_1.default(logger);
        await cacheService.connect();
        const r2Service = new R2Service_1.default(logger);
        await fs_1.default.promises.mkdir("/tmp/recordings", { recursive: true });
        logger.info("R2 service and recordings directory initialized");
        const streamService = new StreamService_1.default(mediaService, messageQueue, cacheService, logger);
        streamService.io = io;
        const chatService = new ChatService_1.default(messageQueue, cacheService, logger);
        logger.info("All services initialized successfully");
        return {
            mediaService,
            messageQueue,
            cacheService,
            streamService,
            chatService,
            r2Service,
        };
    }
    catch (error) {
        logger.error("Failed to initialize services:", error);
        throw error;
    }
}
//# sourceMappingURL=services.config.js.map