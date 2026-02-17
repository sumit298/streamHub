const mongoose = require("mongoose");
const amqp = require("amqplib");
const { execFile } = require("child_process");
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
        process.env.DATABASE_URL || "mongodb://localhost:27018/streamhub",
      );
      logger.info(`VOD Worker: Database connected`);

      this.r2Service = new R2Service(logger);

      this.connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://localhost:5672",
      );

      this.channel = await this.connection.createChannel();
      this.channel.prefetch(1);
      this.channel.assertQueue("vod.conversion", {
        durable: true,
        maxLength: 100
      });
      logger
        .info(`VOD Worker: Started, waiting for jobs...`);
      this.channel.consume("vod.conversion", async (msg) => {
        if (msg) {
          try {
            const data = JSON.parse(msg.content.toString());
            await this.processVOD(data);
            this.channel?.ack(msg);
          } catch (error) {
            logger.error(`VOD processing failed`, error);
            this.channel?.nack(msg, false, false);
          }
        }
      });
    } catch (error) {
      logger.error(`VOD Worker: Startup failed`, error);
      process.exit(1);
    }
  }
  async processVOD(data) {
    const { streamId, webmPath, userId } = data;
    const mp4Path = path.join("/tmp/recordings", `${streamId}.mp4`);

    logger.info(`Processing VOD: ${streamId}`);

    try {
      const stream = await Stream.findOne({
        id: streamId,
      });
      if (!stream) {
        logger.error(`Stream ${streamId} not found`);
        await fs.promises.unlink(webmPath);
        return;
      }

      // convert webm to mp4
      await new Promise((resolve, reject)=> {
        execFile(
            'ffmpeg', ['-i', webmPath, '-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart', mp4Path],{
                maxBuffer: 50 * 1024 * 1024,
            },
            (error) => {if(error) reject(error); else resolve(true)}
        )
      });

      // upload to r2
      const r2Key = `vods/${streamId}/${Date.now()}.mp4`
      await this.r2Service.uploadFile(mp4Path, r2Key);

      // get file size
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
        status: "ready"
      })

      await fs.promises.unlink(webmPath);
      await fs.promises.unlink(mp4Path);

      logger.error(`VOD processed and saved: ${streamId}`)

      
    } catch (error) {
        logger.error(`Error processing VOD: ${streamId}`, error);
        throw error;
    }
  }

  async stop() {
    await this.channel?.close();
    await this.connection?.close();
    await mongoose.disconnect();
    logger.info(`VOD worker stopped`)
  }
}


const worker = new VODWorker();
worker.start();

process.on('SIGINT', () => worker.stop().then(() => process.exit(0)));

