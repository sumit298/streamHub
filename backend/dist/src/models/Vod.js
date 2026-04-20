"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const vodSchema = new mongoose_1.default.Schema({
    streamId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: String,
    category: String,
    thumbnail: String,
    filename: String,
    fileSize: Number,
    duration: Number,
    r2Key: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["recording", "processing", "ready", "failed"],
        default: "recording",
        index: true,
    },
    views: { type: Number, default: 0 },
    recordedAt: { type: Date, default: Date.now },
}, { timestamps: true });
vodSchema.index({ userId: 1, createdAt: -1 });
vodSchema.index({ status: 1, createdAt: -1 });
exports.default = mongoose_1.default.model("VOD", vodSchema);
//# sourceMappingURL=Vod.js.map