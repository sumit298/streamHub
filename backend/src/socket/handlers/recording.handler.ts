import type { Server as SocketIOServer } from "socket.io";
import type { Logger } from "winston";
import type R2Service from "../../services/R2Service";
import type MessageQueue from "../../services/MessageQueue";
import type { AuthenticatedSocket } from "../../types/socket.types";
import fs from "fs";
import path from "path";
import { Stream } from "../../models";
import VOD from "../../models/Vod";
import { finalizedRecordings } from "../../utils/recordingState";
import fixWebmDurationNode from "../../utils/fixWebmDurationNode";

const RECORDINGS_DIR = "/tmp/recordings";
const RECORDING_ID_RE =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-\d+$/i;

interface Services {
  r2Service: R2Service;
  messageQueue: MessageQueue;
  logger: Logger;
}

interface RecordingChunkData {
  streamId: string;
  recordingId: string;
  chunk: ArrayBuffer;
}

interface RecordingEndData {
  streamId: string;
  recordingId: string;
  durationMs: number;
}

interface StreamEndedData {
  streamId: string;
}

export function registerRecordingHandlers(
  socket: AuthenticatedSocket,
  services: Services,
  recordingStreams: Map<string, fs.WriteStream>,
  io: SocketIOServer,
): void {
  const { r2Service, messageQueue, logger } = services;

  // Recording chunk
  socket.on("recording-chunk", async (data: RecordingChunkData) => {
    try {
      const { streamId, recordingId, chunk } = data;

      if (!streamId || !recordingId) return;

      if (!RECORDING_ID_RE.test(recordingId)) {
        logger.warn(`Invalid recordingId in recording-chunk: ${recordingId}`);
        return;
      }

      const streamDoc = await Stream.findOne({
        id: streamId,
        userId: socket.userId,
      });

      if (!streamDoc) {
        logger.warn(
          `Unauthorized recording-chunk from user ${socket.userId} for stream ${streamId}`,
        );
        return;
      }

      let writeStream = recordingStreams.get(recordingId);
      if (!writeStream) {
        const filepath = path.join(RECORDINGS_DIR, `${recordingId}.webm`);
        writeStream = fs.createWriteStream(filepath, { flags: "w" });
        recordingStreams.set(recordingId, writeStream);
      }
      writeStream.write(Buffer.from(chunk));
    } catch (error) {
      logger.error("Recording chunk error", error);
    }
  });

  // Recording end
  socket.on("recording-end", async (data: RecordingEndData) => {
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
        const filepath = path.join(RECORDINGS_DIR, `${recordingId}.webm`);
        try {
          await fs.promises.access(filepath);
          const buffer = await fs.promises.readFile(filepath);
          const fixedBuffer = await fixWebmDurationNode(
            buffer,
            durationMs || 0,
          );
          await fs.promises.writeFile(filepath, fixedBuffer);
          finalizedRecordings.add(recordingId);
          logger.info(`Recording finalized via socket: ${recordingId}`);
        } catch (err) {
          logger.error("Failed to fix WebM metadata", err);
        }
      }
    }
  });

  // Stream ended
  socket.on("stream-ended", async (data: StreamEndedData) => {
    try {
      const { streamId } = data;

      // Validate streamId format (UUID only) - prevents command injection
      if (!/^[a-f0-9-]{36}$/i.test(streamId)) {
        logger.error(`Invalid streamId format: ${streamId}`);
        return;
      }

      const stream = await Stream.findOne({ id: streamId });
      if (!stream) {
        logger.warn(`Stream ${streamId} not found in DB`);
        return;
      }

      // Find all recording files for this stream
      const allFiles = await fs.promises.readdir("/tmp/recordings");
      const streamFiles = allFiles
        .filter((f) => f.startsWith(streamId) && f.endsWith(".webm"))
        .sort()
        .filter((f) => finalizedRecordings.has(f.replace(".webm", "")));

      if (streamFiles.length === 0) {
        logger.warn(`No recordings found for stream ${streamId}`);
        return;
      }

      logger.info(
        `Found ${streamFiles.length} recording(s) for stream ${streamId}`,
      );

      const { execFile } = require("child_process");

      for (const file of streamFiles) {
        const webmPath = path.join("/tmp/recordings", file);

        // Validate file size
        const fileStats = await fs.promises.stat(webmPath);
        if (fileStats.size < 1000) {
          logger.warn(
            `Recording ${file} too small (${fileStats.size} bytes), skipping`,
          );
          await fs.promises.unlink(webmPath).catch(() => {});
          continue;
        }

        // Validate WebM with ffprobe
        try {
          await new Promise((resolve, reject) => {
            execFile("ffprobe", [webmPath], (error: Error) => {
              if (error instanceof Error) reject(new Error("Invalid WebM"));
              else resolve(true);
            });
          });
        } catch (error) {
          const err = error as Error;
          logger.error(`Invalid WebM for ${file}: ${err.message}`);
          await fs.promises.unlink(webmPath).catch(() => {});
          continue;
        }

        // DEVELOPMENT: Use RabbitMQ worker for background processing
        if (process.env.NODE_ENV === "development" && messageQueue.channel) {
          const queued = await messageQueue.publishVODConversion({
            streamId,
            webmPath,
            userId: socket.userId,
          });

          if (queued) {
            logger.info(`VOD queued for worker: ${file}`);
            continue;
          }
          logger.warn(`RabbitMQ unavailable, falling back to sync processing`);
        }

        // PRODUCTION: Upload WebM directly
        logger.info(`Processing VOD synchronously: ${file}`);

        const r2Key = `vods/${streamId}/${file}`;
        await r2Service.uploadFile(webmPath, r2Key);
        const stats = await fs.promises.stat(webmPath);

        await VOD.create({
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

        await fs.promises.unlink(webmPath).catch(() => {});
        finalizedRecordings.delete(file.replace(".webm", ""));
        logger.info(`VOD ready: ${file}`);
      }

      io.to(`user:${stream.userId}`).emit("vod-ready", { streamId });
    } catch (error) {
      logger.error("Stream ended processing error", error);
    }
  });
}
