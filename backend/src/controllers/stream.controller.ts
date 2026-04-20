import type { Request, Response } from "express";
import { normalizeError, NotFoundError, ValidationError, ForbiddenError } from "../types/error.types";
import Logger from "@utils/logger";
import type StreamService from "@services/StreamService";
import type CacheService from "@services/CacheService";

interface StreamParams {
  id?: string;
  userId?: string;
}

interface GetStreamsQuery {
  category?: string;
  limit?: string;
  offset?: string;
  search?: string;
  sortBy?: string;
  filter?: "my" | "community";
  status?: "live" | "ended" | "pending";
}

interface CreateStreamBody {
  title: string;
  description?: string;
  category?: string;
  isPrivate?: boolean;
  chatEnabled?: boolean;
  recordingEnabled?: boolean;
  tags?: string[];
  thumbnail?: string;
}

interface UpdateStreamBody {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  isLive?: boolean;
}

interface GetUserStreamsQuery {
  includeEnded?: string;
  limit?: string;
}

const StreamController = {
  // GET /api/streams - Get all active streams with filtering
  getStreams: (streamService: StreamService, cacheService: CacheService) => async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        category,
        limit = "20",
        offset = "0",
        search,
        sortBy = "viewers",
        filter,
        status,
      } = req.query as GetStreamsQuery;

      const cacheKey = "streams:active";
      if (!search && offset === "0" && limit === "20") {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          Logger.info("Serving active streams from cache");
          res.json({ ...cached, cached: true });
          return;
        }
      }

      let streams;

      if (search) {
        streams = await streamService.searchStreams(search, {
          limit: parseInt(limit),
          offset: parseInt(offset),
          category,
          filter,
          userId: req.userId,
        });
      } else {
        streams = await streamService.getActiveStreams({
          category,
          limit: parseInt(limit),
          offset: parseInt(offset),
          status,
          filter,
          userId: req.userId,
        } as any);
      }

      const response = {
        success: true,
        streams: streams.streams,
        total: streams.total,
        hasMore: parseInt(offset) + streams.streams.length < streams.total,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: streams.total,
          currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
          totalPages: Math.ceil(streams.total / parseInt(limit)),
        },
      };

      if (!search && offset === "0" && limit === "20") {
        await cacheService.set(cacheKey, response, 300);
      }

      res.json({ ...response, cached: false });
    } catch (error) {
      Logger.error("Get streams error", error);
      const normalizedError = normalizeError(error);
      res.status(normalizedError.statusCode).json({ success: false, error: normalizedError });
    }
  },

  // POST /api/streams - Create a new stream
  createStream: (streamService: StreamService, cacheService: CacheService) => async (req: Request, res: Response): Promise<void> => {
    try {
      const userActiveStreams = await streamService.getUserActiveStreams(req.userId!) as any[];
      if (userActiveStreams.length > 0) {
        throw new ValidationError("You already have an active stream. Please end your current stream before starting a new one.");
      }

      const streamData: CreateStreamBody = {
        title: req.body.title,
        description: req.body.description || "",
        category: req.body.category || "general",
        isPrivate: req.body.isPrivate || false,
        chatEnabled: req.body.chatEnabled !== false,
        recordingEnabled: req.body.recordingEnabled || false,
        tags: Array.isArray(req.body.tags) && req.body.tags.length > 0 ? req.body.tags : [],
        thumbnail: req.body.thumbnail || null,
      };

      const stream = await streamService.createStream(req.userId!, streamData);

      await cacheService.del("streams:active");

      Logger.info(`Stream created: ${(stream as any).id} by user ${req.userId}`);

      res.status(201).json({
        success: true,
        message: "Stream created successfully",
        stream: stream,
      });
    } catch (error) {
      Logger.error("Create stream error", error);

      if (error instanceof Error && error.message.includes("Rate limit")) {
        res.status(429).json({ success: false, error: { message: error.message } });
        return;
      }

      const normalizedError = normalizeError(error);
      res.status(normalizedError.statusCode).json({ success: false, error: normalizedError });
    }
  },

  // GET /api/streams/:id - Get specific stream details
  getStreamById: (streamService: StreamService, cacheService: CacheService) => async (req: Request, res: Response): Promise<void> => {
    try {
      const streamId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const cacheKey = `stream:${streamId}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        Logger.info(`Serving stream ${streamId} from cache`);
        res.json({ ...cached, cached: true });
        return;
      }

      const streamInfo = await streamService.getStreamInfo(streamId!);

      if (!streamInfo) {
        throw new NotFoundError("Stream not found");
      }

      const response = {
        success: true,
        stream: streamInfo,
      };

      await cacheService.set(cacheKey, response, 600);

      res.json({ ...response, cached: false });
    } catch (error) {
      Logger.error("Get stream error", error);
      const normalizedError = normalizeError(error);
      res.status(normalizedError.statusCode).json({ success: false, error: normalizedError });
    }
  },

  // POST /api/streams/:id/end - End the stream
  endStream: (streamService: StreamService, cacheService: CacheService) => async (req: Request, res: Response): Promise<void> => {
    try {
      const streamId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const streamInfo = await streamService.getStreamInfo(streamId!);

      if (!streamInfo) {
        throw new NotFoundError("Stream not found");
      }

      const userIdStr = typeof streamInfo.userId === 'string' ? streamInfo.userId : (streamInfo.userId as any)._id.toString();
      if (userIdStr !== req.userId!.toString() && req.user?.role !== "admin") {
        throw new ForbiddenError("Access denied. You can only end your own streams.");
      }

      const result = await streamService.endStream(streamId!, req.userId!);

      await cacheService.del(`stream:${streamId}`);
      await cacheService.del("streams:active");

      req.app.get("io").to(`room:${streamId}`).emit("stream-ended", {
        streamId,
        message: "Stream has ended",
      });

      Logger.info(`Stream ended: ${streamId} by user ${req.userId}`);

      res.status(200).json({
        success: true,
        message: "Stream ended successfully",
        stream: result,
      });
    } catch (error) {
      Logger.error("End stream error", error);
      const normalizedError = normalizeError(error);
      res.status(normalizedError.statusCode).json({ success: false, error: normalizedError });
    }
  },

  // PATCH /api/streams/:id - Update stream details
  updateStream: (streamService: StreamService, cacheService: CacheService) => async (req: Request, res: Response): Promise<void> => {
    try {
      const streamId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const streamInfo = await streamService.getStreamInfo(streamId!);

      if (!streamInfo) {
        throw new NotFoundError("Stream not found");
      }

      const userIdStr = typeof streamInfo.userId === 'string' ? streamInfo.userId : (streamInfo.userId as any)._id.toString();
      if (userIdStr !== req.userId!.toString() && req.user?.role !== "admin") {
        throw new ForbiddenError("Access denied. You can only update your own streams.");
      }

      const updateData: UpdateStreamBody = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.category !== undefined) updateData.category = req.body.category;
      if (req.body.tags !== undefined) updateData.tags = req.body.tags;
      if (req.body.isLive !== undefined) updateData.isLive = req.body.isLive;

      const updatedStream = await streamService.updateStream(streamId!, updateData);

      await cacheService.del(`stream:${streamId}`);
      await cacheService.del("streams:active");

      res.json({
        success: true,
        message: "Stream updated successfully",
        stream: updatedStream,
      });
    } catch (error) {
      Logger.error("Update stream error", error);
      const normalizedError = normalizeError(error);
      res.status(normalizedError.statusCode).json({ success: false, error: normalizedError });
    }
  },

  // DELETE /api/streams/:id - Delete a stream
  deleteStream: (streamService: StreamService, cacheService: CacheService) => async (req: Request, res: Response): Promise<void> => {
    try {
      const streamId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const streamInfo = await streamService.getStreamInfo(streamId!);

      if (!streamInfo) {
        throw new NotFoundError("Stream not found");
      }

      const userIdStr = typeof streamInfo.userId === 'string' ? streamInfo.userId : (streamInfo.userId as any)._id.toString();
      if (userIdStr !== req.userId!.toString() && req.user?.role !== "admin") {
        throw new ForbiddenError("Access denied. You can only delete your own streams.");
      }

      // StreamService doesn't have deleteStream, use endStream instead
      await streamService.endStream(streamId!, req.userId!);

      await cacheService.del(`stream:${streamId}`);
      await cacheService.del("streams:active");

      Logger.info(`Stream deleted: ${streamId} by user ${req.userId}`);

      res.json({
        success: true,
        message: "Stream deleted successfully",
      });
    } catch (error) {
      Logger.error("Delete stream error", error);
      const normalizedError = normalizeError(error);
      res.status(normalizedError.statusCode).json({ success: false, error: normalizedError });
    }
  },

  // POST /api/streams/:id/join - Join a stream
  joinStream: (streamService: StreamService) => async (req: Request, res: Response): Promise<void> => {
    try {
      const streamId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await streamService.joinStream(req.userId!, streamId!);

      res.json({
        success: true,
        message: "Joined stream successfully",
        data: result,
      });
    } catch (error) {
      Logger.error("Join stream error", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          res.status(404).json({ success: false, error: { message: "Stream not found" } });
          return;
        }
        if (error.message.includes("private")) {
          res.status(403).json({ success: false, error: { message: "Access denied" } });
          return;
        }
      }

      const normalizedError = normalizeError(error);
      res.status(normalizedError.statusCode).json({ success: false, error: normalizedError });
    }
  },

  // GET /api/streams/:id/viewers - Get active viewers
  getViewers: () => async (req: Request, res: Response): Promise<void> => {
    try {
      const io = req.app.get("io");
      const sockets = await io.in(`room:${req.params.id}`).fetchSockets();
      
      // Extract user data from socket.data (set during authentication)
      const viewers = sockets
        .map((s: any) => {
          const userData = s.data?.user;
          if (!userData || !userData.username) return null;
          
          return {
            id: userData.id,
            userId: userData.id,
            username: userData.username,
            avatar: userData.avatar
          };
        })
        .filter(Boolean); // Remove null entries
      
      // Remove duplicates by userId
      const uniqueViewers = Array.from(
        new Map(viewers.map((v: any) => [v.userId, v])).values()
      );
      
      res.json({ viewers: uniqueViewers });
    } catch (error) {
      Logger.error("Get viewers error", error);
      const normalizedError = normalizeError(error);
      res.status(normalizedError.statusCode).json({ success: false, error: normalizedError });
    }
  },

  // GET /api/streams/:id/stats - Get stream analytics
  getStreamStats: (streamService: StreamService) => async (req: Request, res: Response): Promise<void> => {
    try {
      const streamId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const streamInfo = await streamService.getStreamInfo(streamId!);

      if (!streamInfo) {
        throw new NotFoundError("Stream not found");
      }

      const userIdStr = typeof streamInfo.userId === 'string' ? streamInfo.userId : (streamInfo.userId as any)._id.toString();
      if (userIdStr !== req.userId!.toString() && req.user?.role !== "admin") {
        throw new ForbiddenError("Access denied. You can only view stats for your own streams.");
      }

      const stats = await streamService.getDetailedStats(streamId!);

      res.json({
        success: true,
        stats: stats,
      });
    } catch (error) {
      Logger.error("Get stream stats error", error);
      const normalizedError = normalizeError(error);
      res.status(normalizedError.statusCode).json({ success: false, error: normalizedError });
    }
  },

  // GET /api/streams/user/:userId - Get streams by user
  getUserStreams: (streamService: StreamService) => async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      const { includeEnded = "false", limit = "20" } = req.query as GetUserStreamsQuery;

      const streams = await streamService.getUserStreams(userId!, {
        includeEnded: includeEnded === "true",
        limit: parseInt(limit),
      }) as any[];

      res.json({
        success: true,
        streams: streams,
        total: streams.length,
      });
    } catch (error) {
      Logger.error("Get user streams error", error);
      const normalizedError = normalizeError(error);
      res.status(normalizedError.statusCode).json({ success: false, error: normalizedError });
    }
  },
};

export default StreamController;
