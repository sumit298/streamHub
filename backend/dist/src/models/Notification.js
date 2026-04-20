"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const notificationSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ["stream-live", "chat-mention", "new-follower"],
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    read: {
        type: Boolean,
        default: false,
        index: true,
    },
    data: {
        streamId: String,
        streamTitle: String,
        followerId: mongoose_1.default.Schema.Types.ObjectId,
        followerUsername: String,
        followerAvatar: String,
    },
}, {
    timestamps: true,
});
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL
exports.default = mongoose_1.default.model("Notification", notificationSchema);
//# sourceMappingURL=Notification.js.map