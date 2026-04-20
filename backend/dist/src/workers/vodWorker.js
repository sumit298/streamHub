"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const amqplib_1 = __importDefault(require("amqplib"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../utils/logger"));
const R2Service_1 = __importDefault(require("../services/R2Service"));
const models_1 = require("../models");
class VODWorker {
    connection;
    channel;
    r2Service;
    constructor() {
        this.connection = null;
        this.channel = null;
        this.r2Service = null;
    }
    async start() {
        try {
            await mongoose_1.default.connect(process.env.DATABASE_URL || "mongodb://localhost:27018/streamhub");
            logger_1.default.info("VOD Worker: Database connected");
            this.r2Service = new R2Service_1.default(logger_1.default);
            this.connection = await amqplib_1.default.connect(process.env.RABBITMQ_URL || "amqp://localhost:5672");
            this.channel = await this.connection.createChannel();
            this.channel.prefetch(1);
            await this.channel.assertQueue("vod.conversion", {
                durable: true,
                maxLength: 100,
            });
            logger_1.default.info("VOD Worker: Started, waiting for jobs...");
            this.channel.consume("vod.conversion", async (msg) => {
                if (!msg)
                    return;
                try {
                    const data = JSON.parse(msg.content.toString());
                    await this.processVOD(data);
                    this.channel?.ack(msg);
                }
                catch (error) {
                    logger_1.default.error("VOD processing failed", error);
                    this.channel?.nack(msg, false, false);
                }
            });
        }
        catch (error) {
            logger_1.default.error("VOD Worker: Startup failed", error);
            process.exit(1);
        }
    }
    async processVOD(data) {
        const { streamId, webmPath, userId } = data;
        const recordingsDir = "/tmp/recordings";
        const mp4Path = path_1.default.join(recordingsDir, `${streamId}.mp4`);
        logger_1.default.info(`Processing VOD: ${streamId}`);
        try {
            await fs_1.default.promises.mkdir(recordingsDir, { recursive: true });
            const stream = await models_1.Stream.findOne({ id: streamId });
            if (!stream) {
                logger_1.default.error(`Stream ${streamId} not found`);
                await fs_1.default.promises.unlink(webmPath).catch(() => { });
                return;
            }
            // FFmpeg conversion
            await new Promise((resolve, reject) => {
                const ffmpeg = (0, child_process_1.spawn)("ffmpeg", [
                    "-y",
                    "-fflags", "+genpts",
                    "-i", webmPath,
                    "-c:v", "libx264",
                    "-c:a", "aac",
                    "-movflags", "+faststart",
                    mp4Path,
                ]);
                ffmpeg.stderr.on("data", (data) => {
                    logger_1.default.info(`[ffmpeg] ${data.toString()}`);
                });
                ffmpeg.on("error", (err) => {
                    logger_1.default.error("FFmpeg spawn error", err);
                    reject(err);
                });
                ffmpeg.on("close", (code) => {
                    if (code !== 0) {
                        reject(new Error(`FFmpeg exited with code ${code}`));
                    }
                    else {
                        resolve();
                    }
                });
            });
            const r2Key = `vods/${streamId}/${Date.now()}.mp4`;
            await this.r2Service.uploadFile(mp4Path, r2Key);
            const stats = await fs_1.default.promises.stat(mp4Path);
            // Get duration via ffprobe
            let duration = 0;
            try {
                const ffprobeOut = await new Promise((resolve, reject) => {
                    const ffprobe = (0, child_process_1.spawn)("ffprobe", [
                        "-v", "error",
                        "-show_entries", "format=duration",
                        "-of", "default=noprint_wrappers=1:nokey=1",
                        mp4Path,
                    ]);
                    let out = "";
                    ffprobe.stdout.on("data", (d) => { out += d.toString(); });
                    ffprobe.on("close", (code) => code === 0 ? resolve(out.trim()) : reject(new Error(`ffprobe exited ${code}`)));
                    ffprobe.on("error", reject);
                });
                duration = Math.round(parseFloat(ffprobeOut));
            }
            catch (e) {
                const error = e;
                logger_1.default.warn("ffprobe failed, duration unknown", error.message);
            }
            await models_1.Vod.create({
                streamId,
                userId: stream.userId,
                title: stream.title,
                description: stream.description,
                category: stream.category,
                thumbnail: stream.thumbnail,
                r2Key,
                fileSize: stats.size,
                filename: `${streamId}_${Date.now()}.mp4`,
                duration,
                status: "ready",
            });
            await fs_1.default.promises.unlink(webmPath).catch(() => { });
            await fs_1.default.promises.unlink(mp4Path).catch(() => { });
            logger_1.default.info(`VOD processed and saved: ${streamId}`);
        }
        catch (error) {
            logger_1.default.error(`Error processing VOD: ${streamId}`, error);
            throw error;
        }
    }
    async stop() {
        await this.channel?.close();
        await this.connection?.close();
        await mongoose_1.default.disconnect();
        logger_1.default.info("VOD worker stopped");
    }
}
const worker = new VODWorker();
worker.start();
process.on("SIGINT", async () => {
    await worker.stop();
    process.exit(0);
});
//# sourceMappingURL=vodWorker.js.map