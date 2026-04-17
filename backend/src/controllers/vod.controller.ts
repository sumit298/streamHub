import Vod from "@models/Vod";
import R2Service from "@services/R2Service";
import Logger from "@utils/logger";
import {
  normalizeError,
  NotFoundError,
  ValidationError,
} from "../types/error.types";
import type { Request, Response } from "express";
import path from "path";
import { promises as fs } from "fs";
import fixWebmDurationNode from "@utils/fixWebmDurationNode";
import { finalizedRecordings } from "@utils/recordingState";

const RECORDINGS_ROOT = "/tmp/recordings";
const RESOLVED_RECORDINGS_ROOT = path.resolve(RECORDINGS_ROOT);
// Allowlist: UUID-timestamp only
const RECORDING_ID_RE =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-\d+$/i;

interface GetVodQuery {
  category?: string;
  userId?: string;
  limit?: string;
  skip?: string;
}

interface UploadChunkBody {
  streamId: string;
  recordingId: string;
}

interface RecordingEndBody {
  streamId: string;
  recordingId: string;
  durationMs?: number;
}

interface VodRequest extends Request {
  r2Service?: R2Service;
}

const VodController = {
  getVods: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        category,
        userId,
        limit = "20",
        skip = "0",
      } = req.query as GetVodQuery;
      const query: any = { status: "ready" };

      if (category) query.category = category;
      if (userId) query.userId = userId;

      const vods = await Vod.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .populate("userId", "username avatar");

      const total = await Vod.countDocuments(query);

      res.json({
        success: true,
        vods,
        total,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: parseInt(skip) + vods.length < total,
        },
      });
    } catch (error) {
      Logger.error("Get VODs error:", error);
      const appError = normalizeError(error);
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

  getVodById: async (req: VodRequest, res: Response): Promise<void> => {
    try {
      const vod = await Vod.findById(req.params.id).populate(
        "userId",
        "username avatar",
      );
      if (!vod) throw new NotFoundError("VOD not found");

      let playbackUrl: string | undefined;
      if (req.r2Service && vod.r2Key) {
        playbackUrl = await req.r2Service.getSignedUrl(vod.r2Key);
      }

      res.json({ success: true, vod: { ...vod.toObject(), playbackUrl } });
    } catch (error) {
      const appError = normalizeError(error);
      Logger.error("Get VOD by ID error:", error);
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

  incrementView: async (req: Request, res: Response): Promise<void> => {
    try {
      const vod = await Vod.findByIdAndUpdate(
        req.params.id,
        { $inc: { views: 1 } },
        {
          new: true,
        },
      );

      if (!vod) {
        throw new NotFoundError("VOD not found");
      }
      res.json({
        success: true,
        message: "View count incremented",
        views: vod.views,
      });
    } catch (error) {
      Logger.error("Increment view error:", error);
      const appError = normalizeError(error);
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

  uploadChunk: async (req: Request, res: Response): Promise<void> => {
    try {
      const { streamId, recordingId } = req.body as UploadChunkBody;
      const chunk = req.file;

      if (!chunk || !streamId || !recordingId) {
        throw new ValidationError(
          "Missing required fields: chunk, streamId, recordingId",
        );
      }

      if (!RECORDING_ID_RE.test(recordingId)) {
        throw new ValidationError("Invalid recording format");
      }

      const filePath = path.resolve(RECORDINGS_ROOT, `${recordingId}.webm`);
      if (!filePath.startsWith(RESOLVED_RECORDINGS_ROOT + path.sep)) {
        throw new ValidationError("Invalid recording path");
      }

      await fs.appendFile(filePath, await fs.readFile(chunk.path));
      await fs.unlink(chunk.path);

      Logger.info(`Chunk uploaded for recording: ${recordingId}`);

      res.json({
        success: true,
        message: "Chunk uploaded successfully",
      });
    } catch (error) {
      Logger.error("Upload chunk error:", error);
      const appError = normalizeError(error);
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

  recordingEnd: async (req: Request, res: Response): Promise<void> => {
    try {
      const { streamId, recordingId, durationMs } =
        req.body as RecordingEndBody;

      if (!streamId || !recordingId) {
        throw new ValidationError(
          "Missing required fields: streamId, recordingId",
        );
      }

      if (!RECORDING_ID_RE.test(recordingId)) {
        throw new ValidationError("Invalid recording format");
      }

      const filePath = path.resolve(RECORDINGS_ROOT, `${recordingId}.webm`);
      if (!filePath.startsWith(RESOLVED_RECORDINGS_ROOT + path.sep)) {
        throw new ValidationError("Invalid recording path");
      }

      try {
        await fs.access(filePath);
      } catch (error) {
        res.json({
          success: true,
          message: "Recording not found, ignoring",
        });
        return;
      }

      const buffer = await fs.readFile(filePath);
      const fixedBuffer = await fixWebmDurationNode(buffer, durationMs || 0);

      await fs.writeFile(filePath, fixedBuffer);

      finalizedRecordings.add(recordingId);

      Logger.info(`Recording finalized: ${recordingId}`);

      res.json({
        success: true,
        message: "Recording finalized successfully",
      });
    } catch (error) {
      Logger.error("Recording end error:", error);
      const appError = normalizeError(error);
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

export default VodController;
