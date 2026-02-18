const mongoose = require("mongoose");
const amqp = require("amqplib");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const R2Service = require("../services/R2Service");
const { Vod, Stream } = require("../models");

class VODWorker {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.r2Service = null;
  }

  async start() {
    try {
      await mongoose.connect(
        process.env.DATABASE_URL || "mongodb://localhost:27018/streamhub"
      );
      logger.info("VOD Worker: Database connected");

      this.r2Service = new R2Service(logger);

      this.connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://localhost:5672"
      );

      this.channel = await this.connection.createChannel();
      this.channel.prefetch(1);

      await this.channel.assertQueue("vod.conversion", {
        durable: true,
        maxLength: 100,
      });

      logger.info("VOD Worker: Started, waiting for jobs...");

      this.channel.consume("vod.conversion", async (msg) => {
        if (!msg) return;

        try {
          const data = JSON.parse(msg.content.toString());
          await this.processVOD(data);
          this.channel.ack(msg);
        } catch (error) {
          logger.error("VOD processing failed", error);
          this.channel.nack(msg, false, false);
        }
      });
    } catch (error) {
      logger.error("VOD Worker: Startup failed", error);
      process.exit(1);
    }
  }

  async processVOD(data) {
    const { streamId, webmPath, userId } = data;
    const recordingsDir = "/tmp/recordings";
    const mp4Path = path.join(recordingsDir, `${streamId}.mp4`);

    logger.info(`Processing VOD: ${streamId}`);

    try {
      await fs.promises.mkdir(recordingsDir, { recursive: true });

      const stream = await Stream.findOne({ id: streamId });
      if (!stream) {
        logger.error(`Stream ${streamId} not found`);
        await fs.promises.unlink(webmPath).catch(() => {});
        return;
      }

      // ---- FFmpeg conversion (PRODUCTION SAFE) ----
      await new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", [
          "-y",
          "-fflags", "+genpts",
          "-i", webmPath,
          "-c:v", "libx264",
          "-c:a", "aac",
          "-movflags", "+faststart",
          mp4Path,
        ]);

        ffmpeg.stderr.on("data", (data) => {
          logger.info(`[ffmpeg] ${data.toString()}`);
        });

        ffmpeg.on("error", (err) => {
          logger.error("FFmpeg spawn error", err);
          reject(err);
        });

        ffmpeg.on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`FFmpeg exited with code ${code}`));
          } else {
            resolve();
          }
        });
      });
      // --------------------------------------------

      const r2Key = `vods/${streamId}/${Date.now()}.mp4`;
      await this.r2Service.uploadFile(mp4Path, r2Key);

      const stats = await fs.promises.stat(mp4Path);

      await Vod.create({
        streamId,
        userId: stream.userId,
        title: stream.title,
        description: stream.description,
        category: stream.category,
        thumbnail: stream.thumbnail,
        r2Key,
        fileSize: stats.size,
        filename: `${streamId}_${Date.now()}.mp4`,
        status: "ready",
      });

      await fs.promises.unlink(webmPath).catch(() => {});
      await fs.promises.unlink(mp4Path).catch(() => {});

      logger.info(`VOD processed and saved: ${streamId}`);
    } catch (error) {
      logger.error(`Error processing VOD: ${streamId}`, error);
      throw error;
    }
  }

  async stop() {
    await this.channel?.close();
    await this.connection?.close();
    await mongoose.disconnect();
    logger.info("VOD worker stopped");
  }
}

const worker = new VODWorker();
worker.start();

process.on("SIGINT", async () => {
  await worker.stop();
  process.exit(0);
});
