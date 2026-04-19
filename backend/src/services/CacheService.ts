import Redis from "ioredis";
import type { Logger } from "winston";

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
  keepAlive?: number;
  connectTimeout: number;
  commandTimeout: number;
  family: number;
}

interface StreamStats {
  viewers: number;
  views: number;
  chatCount: number;
  [key: string]: unknown;
}
class CacheService {
  private logger: Logger;
  public client: Redis | null;
  private publisher: Redis | null;
  private subscriber: Redis | null;

  constructor(logger: Logger) {
    this.logger = logger;
    this.client = null;
    this.publisher = null;
    this.subscriber = null;
  }

  async connect(): Promise<void> {
    try {
      const redisConfig: RedisConfig = {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        db: parseInt(process.env.REDIS_DB || "0"),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: false,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        family: 4,
      };

      // Only add password if it's actually set
      if (process.env.REDIS_PASSWORD) {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }

      this.client = new Redis(redisConfig);
      this.publisher = new Redis(redisConfig);
      this.subscriber = new Redis(redisConfig);

      // error handling
      this.client.on("error", (error: Error) => {
        this.logger.error(`Redis client error: ${error.message}`, { error });
      });

      this.client.on("connect", () => {
        this.logger.info("Redis client connected");
      });

      this.client.on("ready", () => {
        this.logger.info("Redis client ready");
      });

      this.publisher.on("error", (err: Error) => {
        this.logger.error("Redis Publisher Error:", err);
      });

      this.subscriber.on("error", (err: Error) => {
        this.logger.error("Redis Subscriber Error:", err);
      });

      await this.client.ping();
      this.logger.info("Redis connected successfully");
    } catch (error) {
      this.logger.error("Redis connection failed:", error);
      throw error;
    }
  }

  async setUserSession(
    userId: string,
    sessionData: Record<string, unknown>,
    ttl: number = 86400,
  ): Promise<void> {
    try {
      const key = `session:user:${userId}`;

      // Redis pipelining is a technique for improving performance by issuing multiple commands at once without waiting for the response to each individual command.
      const pipeline = this.client!.pipeline();

      for (const [field, value] of Object.entries(sessionData)) {
        pipeline.hset(key, field, JSON.stringify(value));
      }

      pipeline.expire(key, ttl);
      await pipeline.exec();

      this.logger.debug(`User session set: ${userId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Error setting user session: ${message}`, { error });
      throw error;
    }
  }

  async getUserSession(userId: string): Promise<Record<string, unknown>> {
    try {
      const key = `session:user:${userId}`;
      const sessionData = await this.client!.hgetall(key); //all the contents of the hash

      const parsed: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(sessionData)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch (error) {
          parsed[field] = value;
        }
      }
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Error";
      this.logger.error(`Error getting user session: ${message}`, { error });
      return {};
    }
  }

  async deleteUserSession(userId: string): Promise<void> {
    try {
      await this.client!.del(`session:user:${userId}`);
      this.logger.debug(`User session deleted: ${userId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Error deleting user session: ${message}`, { error });
    }
  }

  //stream Management
  async getStream(streamId: string): Promise<Record<string, unknown> | null> {
    try {
      const key = `stream:${streamId}`;
      const streamData = await this.client!.hgetall(key);
      if (!streamData || Object.keys(streamData).length === 0) {
        return null;
      }

      const parsed: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(streamData)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch (error) {
          parsed[field] = value;
        }
      }

      return parsed;
    } catch (error) {
      this.logger.error("Error getting stream", error);
      return null;
    }
  }

  async updateStream(streamId: string, streamData: Record<string, unknown>): Promise<void> {
    try {
      const key = `stream:${streamId}`;
      const pipeline = this.client!.pipeline();

      for (const [field, value] of Object.entries(streamData)) {
        pipeline.hset(key, field, JSON.stringify(value));
      }

      await pipeline.exec();
      this.logger.debug(`Stream updated: ${streamId}`);
    } catch (error) {
      this.logger.error("Error updating stream", error);
      throw error;
    }
  }

  async deleteStream(streamId: string): Promise<void> {
    try {
      const pipeline = this.client!.pipeline();

      pipeline.del(`stream:${streamId}`);
      pipeline.del(`stream:${streamId}:viewers`);
      pipeline.del(`stream:${streamId}:chat`);
      pipeline.del(`stream:${streamId}:stats`);
      pipeline.srem("active:streams", streamId);

      await pipeline.exec();
      this.logger.debug(`Stream deleted, ${streamId}`);
    } catch (error) {
      this.logger.error("Error deleting stream", error);
    }
  }

  async addViewer(streamId: string, userId: string): Promise<number> {
    try {
      const pipeline = this.client!.pipeline();
      pipeline.sadd(`stream:${streamId}:viewers`, userId); //set add
      pipeline.hincrby(`stream:${streamId}:stats`, "totalViews", 1);

      const result = await pipeline.exec();
      const count = await this.client!.scard(`stream:${streamId}:viewers`);

      // update max viewers if needed
      const maxViewers =
        (await this.client!.hget(`stream:${streamId}:stats`, "maxViewers")) ||
        "0";
      if (count > parseInt(maxViewers)) {
        await this.client!.hset(
          `stream:${streamId}:stats`,
          "maxViewers",
          count,
        );
      }

      await this.publisher!.publish(
        "viewer.count",
        JSON.stringify({
          streamId,
          count,
          action: "joined",
          userId,
          timestamp: Date.now(),
        }),
      );

      this.logger.debug(`Viewer added to stream: ${streamId}, ${userId}`);
      return count;
    } catch (error) {
      this.logger.error("Error adding viewer to stream", error);
      throw error;
    }
  }

  async removeViewer(streamId: string, userId: string): Promise<number> {
    try {
      await this.client!.srem(`stream:${streamId}:viewers`, userId);
      const count = await this.client!.scard(`stream:${streamId}:viewers`);

      // publish viewer count update
      await this.publisher!.publish(
        "viewer.count",
        JSON.stringify({
          streamId,
          count,
          action: "left",
          userId,
          timestamp: Date.now(),
        }),
      );

      this.logger.debug(`Viewer removed: ${userId} from stream ${streamId}`);
      return count;
    } catch (error) {
      this.logger.error("Error removing viewer from stream", error);
      return 0;
    }
  }

  async getViewers(streamId: string): Promise<string[]> {
    try {
      return await this.client!.smembers(`stream:${streamId}:viewers`);
    } catch (error) {
      this.logger.error("Error getting viewers", error);
      return [];
    }
  }

  async getViewerCount(streamId: string): Promise<number> {
    try {
      return await this.client!.scard(`stream:${streamId}:viewers`);
    } catch (error) {
      this.logger.error("Error getting viewer count:", error);
      return 0;
    }
  }

  async addChatMessage(
    streamId: string,
    message: Record<string, unknown>,
    maxMessage: number = 100,
  ): Promise<void> {
    try {
      const key = `stream:${streamId}:chat`;
      const pipeline = this.client!.pipeline();

      pipeline.lpush(key, JSON.stringify(message));
      pipeline.ltrim(key, 0, maxMessage - 1);
      pipeline.expire(key, 86400);
      pipeline.hincrby(`stream:${streamId}:stats`, "chatMessages", 1);

      await pipeline.exec();
      this.logger.debug(`Chat message added to stream: ${streamId}`);
    } catch (error) {
      this.logger.error(`Error adding chat message`, error);
      throw error;
    }
  }

  async getChatMessages(
    streamId: string,
    limit: number = 50,
  ): Promise<Array<Record<string, unknown>>> {
    try {
      const messages = await this.client!.lrange(
        `stream:${streamId}:chat`,
        0,
        limit - 1,
      );
      return messages
        .map((msg) => {
          try {
            return JSON.parse(msg);
          } catch (error) {
            return { content: msg, timestamp: Date.now() };
          }
        })
        .reverse();
    } catch (error) {
      this.logger.error("Error getting chat messages", error);
      return [];
    }
  }

  async incrementStreamView(streamId: string): Promise<void> {
    try {
      await this.client!.hincrby(`analytics:views:${streamId}`, "count", 1);
      await this.client!.hincrby(
        `analytics:views:${streamId}`,
        "daily:" + new Date().toISOString().split("T")[0],
        1,
      );
      await this.client!.expire(`analytics:views:${streamId}`, 604800); // 7 days
    } catch (error) {
      this.logger.error("Error incrementing stream view:", error);
    }
  }

  async getStreamStats(streamId: string): Promise<StreamStats> {
    try {
      const [viewers, views, chatCount, stats] = await Promise.all([
        this.client!.scard(`stream:${streamId}:viewers`),
        this.client!.hget(`analytics:views:${streamId}`, "count") || 0,
        this.client!.llen(`stream:${streamId}:chat`),
        this.client!.hgetall(`stream:${streamId}:stats`),
      ]);

      return {
        viewers: parseInt(viewers.toString()),
        views: parseInt(views || "0"),
        chatCount: parseInt(chatCount.toString()),
        ...stats,
      };
    } catch (error) {
      this.logger.error("Error getting stream stats:", error);
      return { viewers: 0, views: 0, chatCount: 0 };
    }
  }

  // Rate Limit
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<boolean> {
    try {
      const current = await this.client!.incr(key);
      if (current === 1) {
        await this.client!.expire(key, Math.ceil(windowMs / 1000));
      }
      return current <= limit;
    } catch (error) {
      this.logger.error("Error checking rate limit:", error);
      return false;
    }
  }

  async subscribe(
    pattern: string,
    callback: (channel: string, data: unknown) => void,
  ): Promise<void> {
    try {
      if (typeof callback !== "function") {
        throw new Error("Callback must be a function");
      }

      // Remove existing listeners to prevent duplicates
      this.subscriber!.removeAllListeners("pmessage");
      await this.subscriber!.psubscribe(pattern);
      this.subscriber!.on(
        "pmessage",
        (_pattern: string, channel: string, message: string) => {
          try {
            const data = JSON.parse(message);
            callback(channel, data);
          } catch (error) {
            this.logger.error("Error parsing pub/sub message:", error);
          }
        },
      );

      this.logger.debug(`Subscribed to pattern: ${pattern}`);
    } catch (error) {
      this.logger.error("Error subscribing:", error);
    }
  }

  async publish(channel: string, data: unknown): Promise<void> {
    try {
      await this.publisher!.publish(channel, JSON.stringify(data));
      this.logger.debug(`Published to channel: ${channel}`);
    } catch (error) {
      this.logger.error("Error publishing:", error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client!.disconnect();
      await this.publisher!.disconnect();
      await this.subscriber!.disconnect();
      this.logger.info("Redis disconnected");
    } catch (error) {
      this.logger.error("Error disconnecting redis", error);
    }
  }

  async get(key: string): Promise<unknown> {
    try {
      const data = await this.client!.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Error getting cache key: ${key}`, { error });
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number = 3600): Promise<void> {
    try {
      await this.client!.setex(key, ttl, JSON.stringify(value));
      this.logger.debug(`Cache set: ${key} (Ttl: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Error setting cache key: ${key}`, { error });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client!.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, { error });
    }
  }
}

export default CacheService;
