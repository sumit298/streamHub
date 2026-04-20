"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketHandlers = initializeSocketHandlers;
const auth_middleware_1 = __importDefault(require("../middleware/auth.middleware"));
const logger_1 = __importDefault(require("../utils/logger"));
const webrtc_handler_1 = require("./handlers/webrtc.handler");
const stream_handler_1 = require("./handlers/stream.handler");
const chat_handler_1 = require("./handlers/chat.handler");
const recording_handler_1 = require("./handlers/recording.handler");
function initializeSocketHandlers(io, services) {
    // Apply authentication middleware
    io.use(auth_middleware_1.default.socketAuth);
    // Error handling middleware
    io.use((socket, next) => {
        socket.on('error', (error) => {
            logger_1.default.error(`Socket error: ${error}`);
        });
        next();
    });
    // Shared state for handlers
    const activeConnections = new Map();
    const recordingStreams = new Map();
    const chatRateLimits = new Map();
    // Handle new connections
    io.on('connection', (socket) => {
        // Cast to AuthenticatedSocket after authentication middleware
        const authSocket = socket;
        logger_1.default.info(`Client connected: ${authSocket.id}, User: ${authSocket.userId}`);
        const userId = authSocket.userId || authSocket.user?._id;
        // Join user notification room
        if (userId) {
            authSocket.join(`user:${userId.toString()}`);
            logger_1.default.info(`User ${userId} joined notification room: user:${userId}`);
        }
        // Track active connection
        activeConnections.set(authSocket.id, {
            userId: authSocket.userId,
            connectedAt: Date.now(),
        });
        // Register all event handlers
        (0, webrtc_handler_1.registerWebRTCHandlers)(authSocket, {
            mediaService: services.mediaService,
            streamService: services.streamService,
            logger: logger_1.default,
        });
        (0, stream_handler_1.registerStreamHandlers)(authSocket, {
            mediaService: services.mediaService,
            streamService: services.streamService,
            logger: logger_1.default,
        }, io, activeConnections);
        (0, chat_handler_1.registerChatHandlers)(authSocket, {
            chatService: services.chatService,
            logger: logger_1.default,
        }, io, chatRateLimits);
        (0, recording_handler_1.registerRecordingHandlers)(authSocket, {
            r2Service: services.r2Service,
            messageQueue: services.messageQueue,
            logger: logger_1.default,
        }, recordingStreams, io);
        // Global error handler
        authSocket.on('error', (error) => {
            logger_1.default.error(`Socket error for ${authSocket.id}: ${error}`);
        });
    });
    logger_1.default.info('Socket.IO handlers initialized');
}
//# sourceMappingURL=socket.server.js.map