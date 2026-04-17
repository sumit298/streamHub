import { v4 as uuidv4 } from "uuid";
import type { Types } from "mongoose";
import { User, Stream, Follow, Notification } from "@models/index";
import MediaService from "./MediaService";
import MessageQueue from "./MessageQueue";
import CacheService from "./CacheService";
import type { Logger } from "winston";
import type { Server as SocketIOServer } from "socket.io";
import {
  DtlsParameters,
  RtpCapabilities,
  RtpParameters,
} from "mediasoup/types";

interface StreamStats {
  viewers: number;
  maxViewers: number;
  totalViews: number;
  chatMessages: number;
  likes: number;
  shares: number;
}

interface CreateStreamData {
  title: string;
  description?: string;
  category?: string;
  isPrivate?: boolean;
  chatEnabled?: boolean;
  recordingEnabled?: boolean;
  tags?: string[];
  thumbnail?: string | null;
}

// stream object structure

interface StreamObject {
  id: string;
  userId: string | Types.ObjectId;
  streamUserName: string;
  title: string;
  description: string;
  category: string;
  isLive: boolean;
  isPending: boolean;
  isPrivate: boolean;
  chatEnabled: boolean;
  recordingEnabled: boolean;
  tags: string[];
  thumbnail: string | null;
  stats: StreamStats;
  startedAt?: Date | string | null;
  endedAt?: Date | string | null;
  duration?: number;
  maxViewers?: number;
  totalViews?: number;
  totalChatMessages?: number;
}

interface JoinStreamResult {
  stream: StreamObject;
  viewers: number;
  messages: unknown[];
  stats: {
    viewers: number;
    views: number;
    chatCount: number;
  };
}

/**
 * Transport direction - discriminated union for type safety
 */
type TransportDirection = "send" | "recv";

/**
 * WebRTC transport data returned from MediaService
 */
interface TransportData {
  id: string;
  iceParameters: unknown;
  iceCandidates: unknown[];
  dtlsParameters: unknown;
}

/**
 * Producer data returned from MediaService
 */
interface ProducerData {
  id: string;
  kind: "audio" | "video";
}

/**
 * Consumer data returned from MediaService
 */
interface ConsumerData {
  id: string;
  producerId: string;
  kind: "audio" | "video";
  rtpParameters: unknown;
}

interface StreamUpdateData {
  isLive?: boolean;
  isPending?: boolean;
  endedAt?: Date | string;
  duration?: number;
  maxViewers?: number;
  totalViews?: number;
  totalChatMessages?: number;
  title?: string;
  description?: string;
  category?: string;
  thumbnail?: string | null;
}

/**
 * Options for querying streams
 */
interface GetStreamsOptions {
  status?: "live" | "ended" | "pending";
  category?: string;
  filter?: "my" | "community";
  userId?: string;
  limit?: number;
  offset?: number;
  includeEnded?: boolean;
}

// transformed stream with streamer info
interface TransformedStream extends Partial<StreamObject> {
  streamer: {
    username: string;
  };
}

// result of stream query with pagination
interface StreamQueryResult {
  total: number;
  streams: TransformedStream[];
}

/**
 * Populated user data in stream
 */
interface PopulatedUser {
  _id: Types.ObjectId;
  username: string;
  email?: string;
  avatar?: string;
}

/**
 * Stream with populated user
 */
interface PopulatedStream extends Omit<StreamObject, "userId"> {
  userId: PopulatedUser;
}

type StreamWithUser = {
  userId: {
    username: string;
    avatar?: string;
  };
} & StreamObject;

class StreamService {
  private readonly mediaService: MediaService;
  private readonly messageQueue: MessageQueue | null;
  private readonly cacheService: CacheService | null;
  private readonly logger: Logger;
  public io: SocketIOServer | null = null;
  constructor(
    mediaService: MediaService,
    messageQueue: MessageQueue | null,
    cacheService: CacheService | null,
    logger: Logger,
  ) {
    this.mediaService = mediaService;
    this.messageQueue = messageQueue;
    this.cacheService = cacheService;
    this.logger = logger;
  }

  /**
   * Set Socket.IO instance for real-time notifications
   * Called from server.ts after initialization
   */
  setSocketIO(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Create a new stream
   *
   * LEARNING: Notice how we handle optional properties with || operator
   * and provide default values. TypeScript ensures all required fields exist.
   */
  async createStream(
    userId: string,
    streamData: CreateStreamData,
  ): Promise<StreamObject> {
    try {
      const streamId = uuidv4();
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }
      const stream = {
        id: streamId,
        userId,
        streamUserName: user.username,
        title: streamData.title,
        description: streamData.description || "",
        category: streamData.category || "general",
        isLive: false,
        isPending: true,
        isPrivate: streamData.isPrivate || false,
        chatEnabled: streamData.chatEnabled !== false,
        recordingEnabled: streamData.recordingEnabled || false,
        tags: streamData.tags || [],
        thumbnail: streamData.thumbnail || null,
        stats: {
          viewers: 0,
          maxViewers: 0,
          totalViews: 0,
          chatMessages: 0,
          likes: 0,
          shares: 0,
        },
      };

      await this.mediaService.createRoom(streamId);

      // Cache service disabled for testing
      if (this.cacheService) {
        // await this.cacheService.updateStream(streamId, stream);
      }

      // Store in database first
      try {
        const streamDoc = new Stream(stream);
        await streamDoc.save();
        this.logger.info(`Stream saved to database: ${streamId}`);
      } catch (dbError) {
        this.logger.error("Database save failed:", dbError);
        throw new Error("Failed to save stream to database");
      }

      // Message queue disabled for testing
      if (this.messageQueue) {
        // await this.messageQueue.publishStreamEvent('create', stream);
      }

      this.logger.info(`Stream created: ${streamId} by user ${userId}`);
      return stream;
    } catch (error) {
      this.logger.error("Error creating stream:", error);
      throw error;
    }
  }

  /**
   * Join an existing stream
   *
   * LEARNING: Notice .toObject() to convert Mongoose Document to plain object
   * This is crucial for TypeScript type compatibility
   */
  async joinStream(
    userId: string,
    streamId: string,
  ): Promise<JoinStreamResult> {
    try {
      let stream: StreamObject | null = null;

      // Get stream from database since cache is disabled
      try {
        const streamDoc = await Stream.findOne({ id: streamId });
        if (streamDoc) {
          // LEARNING: .toObject() converts Mongoose Document to plain object
          stream = streamDoc.toObject();
        }
      } catch (dbError) {
        this.logger.warn("Database query failed:", dbError);
      }

      if (!stream) {
        throw new Error("Stream not found");
      }

      if (stream.isPrivate && stream.userId !== userId) {
        throw new Error("This is a private stream");
      }

      // Cache and message queue disabled for testing
      let viewersCount = 1;
      let messages: unknown[] = [];
      let stats = { viewers: 1, views: 1, chatCount: 0 };

      if (this.cacheService) {
        // viewersCount = await this.cacheService.addViewer(streamId, userId);
        // await this.cacheService.incrementStreamView(streamId);
        // messages = await this.cacheService.getChatMessages(streamId);
        // stats = await this.cacheService.getStreamStats(streamId);
      }

      if (this.messageQueue) {
        // await this.messageQueue.publishUserPresence('joined', {
        //     userId,
        //     streamId,
        //     timestamp: Date.now()
        // })
        // await this.messageQueue.publishAnalyticsEvent('stream.view', {
        //     streamId,
        //     userId,
        //     timestamp: Date.now()
        // });
      }

      this.logger.info(`User ${userId} joined stream ${streamId}`);
      return {
        stream,
        viewers: viewersCount,
        messages,
        stats,
      };
    } catch (error) {
      this.logger.error("Error joining stream:", error);
      throw error;
    }
  }

  /**
   * Create WebRTC transport
   *
   * LEARNING: Using discriminated union (TransportDirection) ensures
   * only valid values ('send' | 'recv') can be passed
   */
  async createTransport(
    roomId: string,
    userId: string,
    direction: TransportDirection,
  ): Promise<TransportData> {
    try {
      // LEARNING: Type guard - runtime validation that matches TypeScript type
      if (!["send", "recv"].includes(direction)) {
        throw new Error("Invalid transport direction");
      }

      const transportData = await this.mediaService.createWebRtcTransport(
        roomId,
        userId,
        direction,
      );

      this.logger.debug(
        `Transport created: ${transportData.id} (${direction}) for user ${userId}`,
      );
      return transportData;
    } catch (error) {
      this.logger.error("Error creating transport:", error);
      throw error;
    }
  }

  /**
   * Connect WebRTC transport
   *
   * LEARNING: Promise<void> for operations that don't return data
   */
  async connectTransport(
    roomId: string,
    userId: string,
    transportId: string,
    dtlsParameters: DtlsParameters,
  ): Promise<void> {
    try {
      await this.mediaService.connectTransport(
        roomId,
        userId,
        transportId,
        dtlsParameters,
      );
      this.logger.debug(
        `Transport connected: ${transportId} for user ${userId}`,
      );
    } catch (error) {
      this.logger.error("Error connecting transport:", error);
      throw error;
    }
  }

  /**
   * Produce media (audio/video/screen)
   */
  async produce(
    roomId: string,
    userId: string,
    transportId: string,
    rtpParameters: RtpParameters,
    kind: "audio" | "video",
    isScreenShare = false,
  ): Promise<ProducerData | null> {
    try {
      const producer = await this.mediaService.produce(
        roomId,
        userId,
        transportId,
        rtpParameters,
        kind,
        isScreenShare,
      );

      // Update database to mark stream as live
      try {
        const stream = (await Stream.findOneAndUpdate(
          { id: roomId },
          {
            isLive: true,
            isPending: false,
            startedAt: new Date(),
          },
          { new: true },
        ).populate("userId", "username avatar")) as unknown as PopulatedStream;

        if (kind === "video" && !isScreenShare && stream) {
          const followers = await Follow.find({
            followingId: userId,
          }).select("followerId");

          const followerIds = followers.map((f) => f.followerId);

          this.logger.info(
            `Found ${followerIds.length} followers for user ${userId}`,
          );

          if (followerIds.length > 0) {
            const notifications = followerIds.map((followerId) => ({
              userId: followerId,
              type: "stream-live",
              title: `${stream.userId.username} is live`,
              message: stream.title,
              data: {
                streamId: roomId,
                streamerId: userId,
                streamerUsername: stream.userId.username,
                streamerAvatar: stream.userId.avatar,
                streamTitle: stream.title,
                streamCategory: stream.category,
              },
              read: false,
            }));

            const createdNotifications =
              await Notification.insertMany(notifications);
            this.logger.info(
              `Created ${createdNotifications.length} notifications in database`,
            );

            if (this.io) {
              followerIds.forEach((followerId) => {
                this.io!.to(`user:${followerId.toString()}`).emit(
                  "notification",
                  {
                    type: "stream-live",
                    title: `${stream.userId.username} is live!`,
                    message: stream.title,
                    data: {
                      streamId: roomId,
                      streamerId: userId,
                      streamerUsername: stream.userId.username,
                      streamerAvatar: stream.userId.avatar,
                      streamTitle: stream.title,
                      streamCategory: stream.category,
                    },
                  },
                );
              });
            }
            this.logger.info(
              `Sent notifications to ${followerIds.length} followers for stream ${roomId}`,
            );
          } else {
            this.logger.info(`No followers found for user ${userId}`);
          }
        }
      } catch (dbError) {
        this.logger.warn("Database update failed:", dbError);
      }

      // Cache and message queue disabled for testing
      if (this.messageQueue) {
        // await this.messageQueue.publishStreamEvent('started', {
        //     streamId: roomId,
        //     userId,
        //     timestamp: Date.now()
        // })
        // await this.messageQueue.publishAnalyticsEvent('producer.created', {
        //     streamId: roomId,
        //     userId,
        //     kind,
        //     producerId: producer.id,
        //     timestamp: Date.now()
        // })
      }

      this.logger.info(
        `Producer Created ${producer.id} (${kind}) for user ${userId} ${isScreenShare ? "[SCREEN]" : "[CAMERA]"}`,
      );
      return producer;
    } catch (error) {
      this.logger.error("Error creating producer:", error);
      throw error;
    }
  }

  async consume(
    roomId: string,
    userId: string,
    producerId: string,
    rtcCapabilities: RtpCapabilities,
  ): Promise<ConsumerData> {
    try {
      const consumerData = await this.mediaService.consume(
        roomId,
        userId,
        producerId,
        rtcCapabilities,
      );

      // Message queue disabled for testing
      if (this.messageQueue) {
        // await this.messageQueue.publishAnalyticsEvent('consumer.created', {
        //     streamId: roomId,
        //     userId,
        //     producerId,
        //     consumerId: consumerData.id,
        //     timestamp: Date.now()
        // })
      }

      this.logger.debug(
        `Consumer created: ${consumerData.id} for user ${userId}`,
      );
      return consumerData;
    } catch (error) {
      this.logger.error("Error creating consumer", error);
      throw error;
    }
  }

  async resumeConsumer(
    roomId: string,
    userId: string,
    consumerId: string,
  ): Promise<void> {
    try {
      await this.mediaService.resumeConsumer(roomId, userId, consumerId);
      this.logger.debug(`Consumer resumed: ${consumerId} for user ${userId}`);
    } catch (error) {
      this.logger.error("Error resuming consumer:", error);
      throw error;
    }
  }

  async endStream(streamId: string, userId: string): Promise<StreamUpdateData> {
    try {
      let stream: StreamObject | null = null;
      let finalStats = { maxViewers: 0, views: 0, chatMessages: 0 };

      // // Get stream from cache or database
      // if (this.cacheService) {
      //     stream = await this.cacheService.getStream(streamId);
      //     finalStats = await this.cacheService.getStreamStats(streamId);
      // }

      // if (!stream) {
      const streamDoc = await Stream.findOne({ id: streamId });
      if (streamDoc) {
        stream = streamDoc.toObject();
      } else {
        throw new Error("Stream not found");
      }
      // }

      await this.mediaService.closeParticipant(streamId, userId);

      const streamUpdate = {
        isLive: false,
        isPending: false,
        endedAt: new Date().toISOString(),
        duration: stream.startedAt
          ? Date.now() - new Date(stream.startedAt).getTime()
          : 0,
        maxViewers: finalStats.maxViewers || 0,
        totalViews: finalStats.views || 0,
        totalChatMessages: finalStats.chatMessages || 0,
      };

      // if (this.cacheService) {
      //     await this.cacheService.updateStream(streamId, streamUpdate);
      // }

      // update database
      try {
        await Stream.updateOne(
          { id: streamId },
          {
            ...streamUpdate,
            endedAt: new Date(),
            duration: streamUpdate.duration,
            "stats.viewers": 0, // Reset current viewers to 0 when stream ends
          },
        );
      } catch (dbError) {
        this.logger.warn("Database update failed:", dbError);
      }

      // Message queue disabled for testing
      if (this.messageQueue) {
        // await this.messageQueue.publishStreamEvent('ended', {
        //     streamId,
        //     userId,
        //     duration: streamUpdate.duration,
        //     maxViewers: finalStats.maxViewers,
        //     totalViews: finalStats.views,
        //     timestamp: Date.now()
        // })
        // await this.messageQueue.publishAnalyticsEvent('stream.ended', {
        //     streamId,
        //     userId,
        //     ...finalStats,
        //     duration: streamUpdate.duration,
        //     timestamp: Date.now()
        // })
      }

      this.logger.info(`Stream ended: ${streamId} by user ${userId}`);

      // Clean up cache after delay (allow viewers to see end message)
      if (this.cacheService) {
        setTimeout(async () => {
          await this.cacheService!.deleteStream(streamId);
        }, 30000); // 30 seconds
      }

      return streamUpdate;
    } catch (error) {
      this.logger.error("Error ending stream:", error);
      throw error;
    }
  }

  async handleUserDisconnect(streamId: string, userId: string): Promise<void> {
    try {
      // Cache service disabled for testing
      if (this.cacheService) {
        // await this.cacheService.removeViewer(streamId, userId);
      }

      await this.mediaService.closeParticipant(streamId, userId);

      // Message queue disabled for testing
      if (this.messageQueue) {
        // await this.messageQueue.publishUserPresence('left', {
        //     userId,
        //     streamId,
        //     timestamp: Date.now()
        // })
      }

      this.logger.debug(`User ${userId} disconnected from stream ${streamId}`);
    } catch (error) {
      this.logger.error("Error handling user disconnect", error);
    }
  }

  async getStreamInfo(streamId: string): Promise<StreamObject | null> {
    try {
      const streamDoc = await Stream.findOne({ id: streamId }).populate(
        "userId",
        "username _id email avatar",
      );
      if (!streamDoc) {
        return null;
      }

      return streamDoc.toObject();
    } catch (error) {
      this.logger.error("Error getting stream info", error);
      throw error;
    }
  }

  async getActiveStreams(
    options: GetStreamsOptions = {},
  ): Promise<StreamQueryResult> {
    try {
      const query: Record<string, unknown> = {};

      if (options.status === "live") {
        query.isLive = true;
      } else if (options.status === "ended") {
        query.isLive = false;
        query.isPending = false;
      } else if (options.status === "pending") {
        query.$or = [{ isPending: true }, { isLive: true }];
      }
      if (options.category) {
        query.category = options.category;
      }

      // Apply filter based on "my" or "community"
      if (options.filter === "my" && options.userId) {
        query.userId = options.userId;
      } else if (options.filter === "community" && options.userId) {
        query.userId = { $ne: options.userId };
      }

      const total = await Stream.countDocuments(query);

      // LEARNING: .lean() returns plain objects (faster than .toObject())
      const streams = await Stream.find(query)
        .limit(options.limit || 20)
        .skip(options.offset || 0)
        .sort({ _id: -1 })
        .lean();

      // Transform userId to streamer object
      const transformedStreams = streams.map((stream) => ({
        ...stream,
        streamer: {
          username: stream.streamUserName || "Unknown",
        },
      }));

      return {
        total,
        streams: transformedStreams,
      };
    } catch (error) {
      this.logger.error(`Error getting active streams:`, error);
      return { streams: [], total: 0 };
    }
  }

  async searchStreams(
    searchQuery: string,
    options: GetStreamsOptions = {},
  ): Promise<StreamQueryResult> {
    try {
      const query: Record<string, unknown> = {
        $or: [
          { title: { $regex: searchQuery, $options: "i" } },
          { description: { $regex: searchQuery, $options: "i" } },
          { category: { $regex: searchQuery, $options: "i" } },
        ],
      };

      // Apply filter based on "my" or "community"
      if (options.filter === "my" && options.userId) {
        query.userId = options.userId;
      } else if (options.filter === "community" && options.userId) {
        query.userId = { $ne: options.userId };
      }

      // Apply category filter if provided
      if (options.category) {
        query.category = options.category;
      }

      const total = await Stream.countDocuments(query);

      const streams = await Stream.find(query)
        .limit(options.limit || 20)
        .skip(options.offset || 0)
        .sort({ createdAt: -1 })
        .lean();

      // Transform userId to streamer object
      const transformedStreams: TransformedStream[] = streams.map((stream) => ({
        ...stream,
        streamer: {
          username: stream.streamUserName || "Unknown",
        },
      }));

      return {
        total,
        streams: transformedStreams,
      };
    } catch (error) {
      this.logger.error("Error searching streams:", error);
      return { streams: [], total: 0 };
    }
  }

  async getUserActiveStreams(userId: string): Promise<unknown> {
    try {
      return await Stream.find({ userId, isLive: true });
    } catch (error) {
      this.logger.error("Error getting user active streams:", error);
      return [];
    }
  }

  async updateStream(
    streamId: string,
    updateData: Partial<StreamObject>,
  ): Promise<StreamObject | null> {
    try {
      // await this.cacheService.updateStream(streamId, updateData);
      await Stream.updateOne({ id: streamId }, updateData);
      return await this.getStreamInfo(streamId);
    } catch (error) {
      this.logger.error("Error updating stream:", error);
      throw error;
    }
  }

  async getDetailedStats(streamId: string): Promise<Record<string, unknown>> {
    try {
      if (!this.cacheService) {
        return {};
      }
      return await this.cacheService.getStreamStats(streamId);
    } catch (error) {
      this.logger.error("Error getting detailed stats:", error);
      return {};
    }
  }

  async getUserStreams(
    userId: string,
    options: GetStreamsOptions = {},
  ): Promise<unknown> {
    try {
      const query: Record<string, unknown> = { userId };
      if (!options.includeEnded) {
        query.isLive = true;
      }
      return await Stream.find(query)
        .limit(options.limit || 20)
        .sort({ createdAt: -1 });
    } catch (error) {
      this.logger.error("Error getting user streams:", error);
      return [];
    }
  }
}

export default StreamService;
