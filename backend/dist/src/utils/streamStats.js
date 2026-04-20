"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateViewerStats = updateViewerStats;
exports.incrementChatMessages = incrementChatMessages;
const Stream_1 = __importDefault(require("../models/Stream"));
/**
 * Update stream viewer stats
 */
async function updateViewerStats(streamId, currentViewers) {
    try {
        const stream = await Stream_1.default.findOne({ id: streamId });
        if (!stream)
            return;
        const updates = {
            "stats.viewers": currentViewers,
        };
        // Update maxViewers if current is higher
        if (currentViewers > stream.stats.maxViewers) {
            updates["stats.maxViewers"] = currentViewers;
        }
        await Stream_1.default.updateOne({ id: streamId }, { $set: updates });
    }
    catch (error) {
        console.error("Failed to update viewer stats:", error);
    }
}
/**
 * Increment chat message count
 */
async function incrementChatMessages(streamId) {
    try {
        await Stream_1.default.updateOne({ id: streamId }, { $inc: { "stats.chatMessages": 1 } });
    }
    catch (error) {
        console.error("Failed to increment chat messages:", error);
    }
}
//# sourceMappingURL=streamStats.js.map