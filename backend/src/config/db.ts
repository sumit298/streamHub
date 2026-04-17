import mongoose from "mongoose";
import type { Logger } from "winston";

export async function connectDatabase(logger: Logger): Promise<void> {
  try {
    await mongoose.connect(
      process.env.DATABASE_URL || "mongodb://localhost:27018/streamhub",
      {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      },
    );

    logger.info("Database connected", {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      url: process.env.DATABASE_URL?.replace(
        /\/\/([^:]+):([^@]+)@/,
        "//$1:****@",
      ), // Hide password
    });
  } catch (error) {
    logger.error("Database connection failed:", error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
