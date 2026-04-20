"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRecordingHandlers = registerRecordingHandlers;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const models_1 = require("../../models");
const Vod_1 = __importDefault(require("../../models/Vod"));
const recordingState_1 = require("../../utils/recordingState");
const fixWebmDurationNode_1 = __importDefault(require("../../utils/fixWebmDurationNode"));
const RECORDINGS_DIR = "/tmp/recordings";
const RECORDING_ID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-\d+$/i;
function registerRecordingHandlers(socket, services, recordingStreams, io) {
    const { r2Service, messageQueue, logger } = services;
    // Recording chunk
    socket.on("recording-chunk", async (data) => {
        try {
            const { streamId, recordingId, chunk } = data;
            if (!streamId || !recordingId)
                return;
            if (!RECORDING_ID_RE.test(recordingId)) {
                logger.warn(`Invalid recordingId in recording-chunk: ${recordingId}`);
                return;
            }
            const streamDoc = await models_1.Stream.findOne({
                id: streamId,
                userId: socket.userId,
            });
            if (!streamDoc) {
                logger.warn(`Unauthorized recording-chunk from user ${socket.userId} for stream ${streamId}`);
                return;
            }
            let writeStream = recordingStreams.get(recordingId);
            if (!writeStream) {
                const filepath = path_1.default.join(RECORDINGS_DIR, `${recordingId}.webm`);
                writeStream = fs_1.default.createWriteStream(filepath, { flags: "w" });
                recordingStreams.set(recordingId, writeStream);
            }
            writeStream.write(Buffer.from(chunk));
        }
        catch (error) {
            logger.error("Recording chunk error", error);
        }
    });
    // Recording end
    socket.on("recording-end", async (data) => {
        const { streamId, recordingId, durationMs } = data;
        const key = recordingId || streamId;
        if (!RECORDING_ID_RE.test(key)) {
            logger.warn(`Invalid recording key in recording-end: ${key}`);
            return;
        }
        const writeStream = recordingStreams.get(key);
        if (writeStream) {
            writeStream.end();
            recordingStreams.delete(key);
            if (recordingId) {
                const filepath = path_1.default.join(RECORDINGS_DIR, `${recordingId}.webm`);
                try {
                    await fs_1.default.promises.access(filepath);
                    const buffer = await fs_1.default.promises.readFile(filepath);
                    const fixedBuffer = await (0, fixWebmDurationNode_1.default)(buffer, durationMs || 0);
                    await fs_1.default.promises.writeFile(filepath, fixedBuffer);
                    recordingState_1.finalizedRecordings.add(recordingId);
                    logger.info(`Recording finalized via socket: ${recordingId}`);
                }
                catch (err) {
                    logger.error("Failed to fix WebM metadata", err);
                }
            }
        }
    });
    // Stream ended
    socket.on("stream-ended", async (data) => {
        try {
            const { streamId } = data;
            // Validate streamId format (UUID only) - prevents command injection
            if (!/^[a-f0-9-]{36}$/i.test(streamId)) {
                logger.error(`Invalid streamId format: ${streamId}`);
                return;
            }
            const stream = await models_1.Stream.findOne({ id: streamId });
            if (!stream) {
                logger.warn(`Stream ${streamId} not found in DB`);
                return;
            }
            // Find all recording files for this stream
            const allFiles = await fs_1.default.promises.readdir("/tmp/recordings");
            const streamFiles = allFiles
                .filter((f) => f.startsWith(streamId) && f.endsWith(".webm"))
                .sort()
                .filter((f) => recordingState_1.finalizedRecordings.has(f.replace(".webm", "")));
            if (streamFiles.length === 0) {
                logger.warn(`No recordings found for stream ${streamId}`);
                return;
            }
            logger.info(`Found ${streamFiles.length} recording(s) for stream ${streamId}`);
            const { execFile } = require("child_process");
            for (const file of streamFiles) {
                const webmPath = path_1.default.join("/tmp/recordings", file);
                // Validate file size
                const fileStats = await fs_1.default.promises.stat(webmPath);
                logger.info(`Recording ${file} size: ${fileStats.size} bytes`);
                if (fileStats.size < 1000) {
                    logger.warn(`Recording ${file} too small (${fileStats.size} bytes), skipping`);
                    await fs_1.default.promises.unlink(webmPath).catch(() => { });
                    continue;
                }
                // Validate WebM with detailed ffprobe output
                let isValidWebm = false;
                try {
                    await new Promise((resolve, reject) => {
                        execFile("ffprobe", ["-v", "error", "-show_format", "-show_streams", webmPath], (error, stdout, stderr) => {
                            if (error instanceof Error) {
                                logger.error(`ffprobe validation failed for ${file}:`);
                                logger.error(`  Error: ${error.message}`);
                                logger.error(`  Stderr: ${stderr}`);
                                logger.error(`  Stdout: ${stdout}`);
                                reject(new Error("Invalid WebM"));
                            }
                            else {
                                logger.info(`ffprobe validation passed for ${file}`);
                                logger.info(`  Format info: ${stdout.substring(0, 200)}...`);
                                resolve(true);
                            }
                        });
                    });
                    isValidWebm = true;
                }
                catch (error) {
                    const err = error;
                    logger.error(`WebM validation failed for ${file}: ${err.message}`);
                    // In development, try to process anyway if file is large enough
                    if (process.env.NODE_ENV === "development" && fileStats.size > 10000) {
                        logger.warn(`Development mode: Attempting to process despite validation failure`);
                        isValidWebm = true;
                    }
                    else {
                        await fs_1.default.promises.unlink(webmPath).catch(() => { });
                        continue;
                    }
                }
                if (!isValidWebm)
                    continue;
                // DEVELOPMENT: Send to worker for MP4 conversion (skip validation, ffmpeg is forgiving)
                if (process.env.NODE_ENV === "development" && messageQueue.channel) {
                    const queued = await messageQueue.publishVODConversion({
                        streamId,
                        webmPath,
                        userId: socket.userId,
                    });
                    if (queued) {
                        logger.info(`VOD queued for worker (WebM→MP4): ${file}`);
                        continue;
                    }
                    logger.warn(`RabbitMQ unavailable, falling back to production mode`);
                }
                // PRODUCTION: Validate WebM before uploading directly
                try {
                    await new Promise((resolve, reject) => {
                        execFile("ffprobe", [webmPath], (error) => {
                            if (error instanceof Error)
                                reject(new Error("Invalid WebM"));
                            else
                                resolve(true);
                        });
                    });
                }
                catch (error) {
                    const err = error;
                    logger.error(`Invalid WebM for ${file}: ${err.message}`);
                    await fs_1.default.promises.unlink(webmPath).catch(() => { });
                    continue;
                }
                // PRODUCTION: Upload WebM directly
                logger.info(`Processing VOD synchronously: ${file}`);
                const r2Key = `vods/${streamId}/${file}`;
                await r2Service.uploadFile(webmPath, r2Key);
                const stats = await fs_1.default.promises.stat(webmPath);
                await Vod_1.default.create({
                    streamId,
                    userId: stream.userId,
                    title: stream.title,
                    description: stream.description,
                    category: stream.category,
                    thumbnail: stream.thumbnail,
                    r2Key,
                    fileSize: stats.size,
                    filename: file,
                    status: "ready",
                });
                await fs_1.default.promises.unlink(webmPath).catch(() => { });
                recordingState_1.finalizedRecordings.delete(file.replace(".webm", ""));
                logger.info(`VOD ready: ${file}`);
            }
            io.to(`user:${stream.userId}`).emit("vod-ready", { streamId });
        }
        catch (error) {
            logger.error("Stream ended processing error", error);
        }
    });
}
//# sourceMappingURL=recording.handler.js.map