"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const socket_io_1 = require("socket.io");
function createServer(app, logger) {
    let server;
    if (process.env.NODE_ENV === "production" && fs_1.default.existsSync("./fullchain.pem")) {
        const httpsOptions = {
            key: fs_1.default.readFileSync("./privkey.pem"),
            cert: fs_1.default.readFileSync("./fullchain.pem"),
        };
        server = https_1.default.createServer(httpsOptions, app);
        logger.info("Using HTTPS server");
    }
    else {
        server = http_1.default.createServer(app);
        logger.info("Using HTTP server");
    }
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN ||
                process.env.CLIENT_URL ||
                "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ["polling", "websocket"],
        allowUpgrades: true,
        pingTimeout: 60000,
        pingInterval: 25000,
    });
    app.set("io", io);
    return { server, io };
}
//# sourceMappingURL=server.config.js.map