"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerShutdownHandler = registerShutdownHandler;
const mongoose_1 = __importDefault(require("mongoose"));
let shuttingDown = false;
function registerShutdownHandler(server, io, services, logger) {
    process.on("SIGINT", async () => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        logger.info("Shutting down gracefully...");
        io?.emit("server-shutdown");
        await services.mediaService?.cleanup();
        await services.messageQueue?.close();
        await mongoose_1.default.disconnect();
        server.close(() => {
            logger.info("Server closed");
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 5000);
    });
}
//# sourceMappingURL=shutdown.handler.js.map