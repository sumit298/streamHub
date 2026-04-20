"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
async function connectDatabase(logger) {
    try {
        await mongoose_1.default.connect(process.env.DATABASE_URL || "mongodb://localhost:27018/streamhub", {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        logger.info("Database connected", {
            host: mongoose_1.default.connection.host,
            name: mongoose_1.default.connection.name,
            url: process.env.DATABASE_URL?.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@"), // Hide password
        });
    }
    catch (error) {
        logger.error("Database connection failed:", error);
        throw error;
    }
}
/**
 * Disconnect from MongoDB
 */
async function disconnectDatabase() {
    await mongoose_1.default.disconnect();
}
//# sourceMappingURL=db.js.map