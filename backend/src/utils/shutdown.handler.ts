import type { Server } from "http";
import type { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import type { Logger } from "winston";
import type { Services } from "../config/services.config";

let shuttingDown = false;

export function registerShutdownHandler(
  server: Server,
  io: SocketIOServer,
  services: Services,
  logger: Logger
): void {
  process.on("SIGINT", async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info("Shutting down gracefully...");

    io?.emit("server-shutdown");

    await services.mediaService?.cleanup();
    await services.messageQueue?.close();
    await mongoose.disconnect();

    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 5000);
  });
}
