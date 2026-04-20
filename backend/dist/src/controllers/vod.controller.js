"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Vod_1 = __importDefault(require("../models/Vod"));
const logger_1 = __importDefault(require("../utils/logger"));
const error_types_1 = require("../types/error.types");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const fixWebmDurationNode_1 = __importDefault(require("../utils/fixWebmDurationNode"));
const recordingState_1 = require("../utils/recordingState");
const index_1 = require("../models/index");
const RECORDINGS_ROOT = "/tmp/recordings";
const RESOLVED_RECORDINGS_ROOT = path_1.default.resolve(RECORDINGS_ROOT);
// Allowlist: UUID-timestamp only
const RECORDING_ID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-\d+$/i;
const VodController = {
    getVods: async (req, res) => {
        try {
            const { category, userId, limit = "20", skip = "0", } = req.query;
            const query = { status: "ready" };
            if (typeof category === "string" && category.trim().length > 0) {
                query.category = { $eq: category.trim() };
            }
            if (typeof userId === "string" && userId.trim().length > 0) {
                query.userId = { $eq: userId.trim() };
            }
            // ✅ FIX: Validate numeric parameters
            const parsedSkip = Number.parseInt(skip, 10);
            const parsedLimit = Number.parseInt(limit, 10);
            const safeSkip = Number.isNaN(parsedSkip) || parsedSkip < 0 ? 0 : parsedSkip;
            const safeLimit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 20 : parsedLimit;
            const vods = await Vod_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(safeSkip)
                .limit(safeLimit)
                .populate("userId", "username avatar");
            const total = await Vod_1.default.countDocuments(query);
            res.json({
                success: true,
                vods,
                total,
                pagination: {
                    limit: safeLimit,
                    skip: safeSkip,
                    hasMore: safeSkip + vods.length < total,
                },
            });
        }
        catch (error) {
            logger_1.default.error("Get VODs error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    getVodById: async (req, res) => {
        try {
            const vod = await Vod_1.default.findById(req.params.id).populate("userId", "username avatar");
            if (!vod)
                throw new error_types_1.NotFoundError("VOD not found");
            let playbackUrl;
            if (req.r2Service && vod.r2Key) {
                playbackUrl = await req.r2Service.getSignedUrl(vod.r2Key);
            }
            res.json({ success: true, vod: { ...vod.toObject(), playbackUrl } });
        }
        catch (error) {
            const appError = (0, error_types_1.normalizeError)(error);
            logger_1.default.error("Get VOD by ID error:", error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    incrementView: async (req, res) => {
        try {
            const vod = await Vod_1.default.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, {
                new: true,
            });
            if (!vod) {
                throw new error_types_1.NotFoundError("VOD not found");
            }
            res.json({
                success: true,
                message: "View count incremented",
                views: vod.views,
            });
        }
        catch (error) {
            logger_1.default.error("Increment view error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    uploadChunk: async (req, res) => {
        try {
            const { streamId, recordingId } = req.body;
            const chunk = req.file;
            if (!chunk || !streamId || !recordingId) {
                throw new error_types_1.ValidationError("Missing required fields: chunk, streamId, recordingId");
            }
            const stream = await index_1.Stream.findOne({
                id: streamId,
                userId: req.userId,
            });
            if (!stream) {
                throw new error_types_1.NotFoundError("Stream not found");
            }
            if (!RECORDING_ID_RE.test(recordingId)) {
                throw new error_types_1.ValidationError("Invalid recording format");
            }
            const filePath = path_1.default.resolve(RECORDINGS_ROOT, `${recordingId}.webm`);
            if (!filePath.startsWith(RESOLVED_RECORDINGS_ROOT + path_1.default.sep)) {
                throw new error_types_1.ValidationError("Invalid recording path");
            }
            await fs_1.promises.appendFile(filePath, await fs_1.promises.readFile(chunk.path));
            await fs_1.promises.unlink(chunk.path);
            logger_1.default.info(`Chunk uploaded for recording: ${recordingId}`);
            res.json({
                success: true,
                message: "Chunk uploaded successfully",
            });
        }
        catch (error) {
            logger_1.default.error("Upload chunk error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    recordingEnd: async (req, res) => {
        try {
            const { streamId, recordingId, durationMs } = req.body;
            if (!streamId || !recordingId) {
                throw new error_types_1.ValidationError("Missing required fields: streamId, recordingId");
            }
            // ✅ FIX: Verify ownership
            const stream = await index_1.Stream.findOne({
                id: streamId,
                userId: req.userId,
            });
            if (!stream) {
                throw new error_types_1.ForbiddenError("You don't own this stream");
            }
            if (!RECORDING_ID_RE.test(recordingId)) {
                throw new error_types_1.ValidationError("Invalid recording format");
            }
            const filePath = path_1.default.resolve(RECORDINGS_ROOT, `${recordingId}.webm`);
            if (!filePath.startsWith(RESOLVED_RECORDINGS_ROOT + path_1.default.sep)) {
                throw new error_types_1.ValidationError("Invalid recording path");
            }
            try {
                await fs_1.promises.access(filePath);
            }
            catch (error) {
                res.json({
                    success: true,
                    message: "Recording not found, ignoring",
                });
                return;
            }
            const buffer = await fs_1.promises.readFile(filePath);
            const fixedBuffer = await (0, fixWebmDurationNode_1.default)(buffer, durationMs || 0);
            await fs_1.promises.writeFile(filePath, fixedBuffer);
            recordingState_1.finalizedRecordings.add(recordingId);
            logger_1.default.info(`Recording finalized: ${recordingId}`);
            res.json({
                success: true,
                message: "Recording finalized successfully",
            });
        }
        catch (error) {
            logger_1.default.error("Recording end error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
};
exports.default = VodController;
//# sourceMappingURL=vod.controller.js.map