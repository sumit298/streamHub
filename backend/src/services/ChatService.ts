import { v4 as uuidv4 } from "uuid";
import { ChatMessage, User } from "@models/index";
import sanitizeHtml from "sanitize-html";
import type { Logger } from "winston";
import type MessageQueue from "./MessageQueue";
import type CacheService from "./CacheService";


interface MessageData {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  streamId: string;
  mentions: string[];
  content: string;
  type: string;
  timestamp: string;
  edited: boolean;
  deleted: boolean;
  reactions: Record<string, unknown>;
  [key: string]: unknown;
}

class ChatService {
  private messageQueue: MessageQueue;
  public cacheService: CacheService;
  private logger: Logger;
  private messageTypes: string[];

  constructor(messageQueue: MessageQueue, cacheService: CacheService, logger: Logger) {
    this.messageQueue = messageQueue;
    this.cacheService = cacheService;
    this.logger = logger;
    this.messageTypes = ["text", "emoji", "system", "gif", "sticker"];
  }

  async sendMessage(
    userId: string,
    streamId: string,
    content: string,
    type: string = "text",
    username: string | null = null
  ): Promise<MessageData> {
    try {
      if (!this.messageTypes.includes(type)) {
        throw new Error("Invalid message type");
      }

      if (!content || content.trim().length === 0) {
        throw new Error("Message content cannot be empty");
      }

      if (content.length > 500) {
        throw new Error("Message too long");
      }

      const mentionRegex = /@(\w+)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        const mentionedUser = await User.findOne({ username: match[1] });
        if (mentionedUser) mentions.push(mentionedUser._id.toString());
      }

      const user = await User.findById(userId).select("avatar");

      const message: MessageData = {
        id: uuidv4(),
        userId,
        username: username || "Anonymous",  // Fix: Remove null
        ...(user?.avatar && { avatar: user.avatar }),  // Only include if exists
        streamId,
        mentions,
        content: sanitizeHtml(content.trim(), {
          allowedTags: [],
          allowedAttributes: {},
        }),
        type,
        timestamp: new Date().toISOString(),
        edited: false,
        deleted: false,
        reactions: {},
      };

      if (this.cacheService) {
        await this.cacheService.addChatMessage(streamId, message);  // Fix: Type assertion
      }

      try {
        const messageDoc = new ChatMessage(message);
        await messageDoc.save();
      } catch (dbError) {
        this.logger.warn("Chat message database save failed:", dbError);
      }

      this.logger.debug(`Chat message sent: ${message.id} in stream ${streamId}`);
      return message;
    } catch (error) {
      this.logger.error("Error sending chat message:", error);
      throw error;
    }
  }

  async getMessages(
    streamId: string,
    limit: number = 50,
    before: string | null = null
  ): Promise<any[]> {
    try {
      let messages: any[] = [];

      try {
        const query: any = { streamId, deleted: false };
        if (before) {
          query.timestamp = { $lt: before };
        }

        const dbMessages = await ChatMessage.find(query)
          .sort({ timestamp: -1 })
          .limit(limit);

        messages = dbMessages.map((msg) => msg.toObject()).reverse();
      } catch (dbError) {
        this.logger.warn("Chat messages database query failed:", dbError);
      }

      return messages;
    } catch (error) {
      this.logger.error("Error getting chat messages:", error);
      return [];
    }
  }

  async deleteMessage(
    messageId: string,
    userId: string,
    isModeratorOrOwner: boolean = false
  ): Promise<boolean> {
    try {
      const message = await ChatMessage.findOne({ id: messageId });
      if (!message) {
        throw new Error("Message not found");
      }

      // Fix: Convert ObjectId to string for comparison
      if (message.userId.toString() !== userId && !isModeratorOrOwner) {
        throw new Error("Unauthorized to delete this message");
      }

      message.deleted = true;
      message.deletedAt = new Date();
      message.deletedBy = userId as any;
      await message.save();

      const systemMessage = {
        id: uuidv4(),
        userId: "system",
        streamId: message.streamId,
        content: "A message was deleted",
        type: "system",
        timestamp: new Date().toISOString(),
        originalMessageId: messageId,
      };

      await this.cacheService.addChatMessage(message.streamId, systemMessage);
      await this.messageQueue.publishChatMessage(systemMessage);

      await this.messageQueue.publishAnalyticsEvent("chat.message.deleted", {
        streamId: message.streamId,
        messageId,
        deletedBy: userId,
        timestamp: Date.now(),
      });

      this.logger.info(`Chat message deleted: ${messageId} by user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error("Error deleting chat message:", error);
      throw error;
    }
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<any> {
    try {
      const message = await ChatMessage.findOne({
        id: messageId,
        deleted: false,
      });
      if (!message) {
        throw new Error("Message not found");
      }

      // Fix: Use Map methods instead of bracket notation
      if (!message.reactions) {
        message.reactions = new Map();
      }

      const currentReactions = message.reactions.get(emoji) || [];
      const userIdObj = userId as any;
      const userIndex = currentReactions.findIndex((entry: any) => 
        entry.userId.toString() === userId
      );

      if (userIndex === -1) {
        currentReactions.push({
          userId: userIdObj,
          timestamp: new Date(),
        });
        message.reactions.set(emoji, currentReactions);
      } else {
        currentReactions.splice(userIndex, 1);
        if (currentReactions.length === 0) {
          message.reactions.delete(emoji);
        } else {
          message.reactions.set(emoji, currentReactions);
        }
      }

      await message.save();

      await this.messageQueue.publishChatMessage({
        type: "reaction_update",
        messageId,
        reactions: Object.fromEntries(message.reactions),
        streamId: message.streamId,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Reaction ${emoji} ${userIndex === -1 ? "added" : "removed"} by user ${userId}`
      );
      return Object.fromEntries(message.reactions);
    } catch (error) {
      this.logger.error("Error adding reaction:", error);
      throw error;
    }
  }

  async moderateMessage(
    messageId: string,
    action: string,
    moderatorId: string,
    reason: string = ""
  ): Promise<any> {
    try {
      const validActions = ["delete", "timeout", "warn"];
      if (!validActions.includes(action)) {
        throw new Error("Invalid moderation action");
      }

      const message = await ChatMessage.findOne({ id: messageId });
      if (!message) {
        throw new Error("Message not found");
      }

      const moderationEvent = {
        id: uuidv4(),
        messageId,
        userId: message.userId.toString(),
        streamId: message.streamId,
        action,
        moderatorId,
        reason,
        timestamp: new Date().toISOString(),
      };

      switch (action) {
        case "delete":
          await this.deleteMessage(messageId, moderatorId, true);
          break;
        case "timeout":
          await this.cacheService.client!.setex(
            `timeout:user:${message.userId}`,
            300,
            "true"
          );
          break;
        case "warn":
          break;
      }

      await this.messageQueue.publishAnalyticsEvent("chat.moderation", moderationEvent);

      this.logger.info(
        `Message moderated: ${messageId}, action: ${action} by ${moderatorId}`
      );
      return moderationEvent;
    } catch (error) {
      this.logger.error("Error moderating message:", error);
      throw error;
    }
  }

  async isUserTimedOut(userId: string): Promise<boolean> {
    try {
      const timeout = await this.cacheService.client!.get(`timeout:user:${userId}`);
      return !!timeout;
    } catch (error) {
      this.logger.error("Error checking user timeout:", error);
      return false;
    }
  }

  async getChatStats(streamId: string): Promise<any> {
    try {
      const stats = await this.cacheService.getStreamStats(streamId);

      const [totalMessages, uniqueUsers, recentActivity] = await Promise.all([
        ChatMessage.countDocuments({ streamId, deleted: false }),
        ChatMessage.distinct("userId", { streamId, deleted: false }),
        ChatMessage.find({ streamId, deleted: false })
          .sort({ timestamp: -1 })
          .limit(100)
          .select("timestamp"),
      ]);

      const now = Date.now();
      const recentMessages = recentActivity.filter(
        (msg: any) => now - new Date(msg.timestamp).getTime() < 300000
      );

      return {
        totalMessages,
        uniqueChatters: uniqueUsers.length,
        messagesPerMinute: Math.round(recentMessages.length / 5),
        recentActivity: recentMessages.length,
        ...stats,
      };
    } catch (error) {
      this.logger.error("Error getting chat stats:", error);
      return {
        totalMessages: 0,
        uniqueChatters: 0,
        messagesPerMinute: 0,
        recentActivity: 0,
      };
    }
  }

  async isMessageOwner(messageId: string, userId: string): Promise<boolean> {
    try {
      const message = await ChatMessage.findOne({ id: messageId });
      return message ? message.userId.toString() === userId : false;
    } catch (error) {
      this.logger.error("Error checking message ownership:", error);
      return false;
    }
  }

  async flagMessage(
    messageId: string,
    userId: string,
    reason: string,
    details: string = ""
  ): Promise<any> {
    try {
      const message = await ChatMessage.findOne({ id: messageId });
      if (!message) {
        throw new Error("Message not found");
      }

      const flag = {
        id: uuidv4(),
        messageId,
        flaggedBy: userId,
        reason,
        details,
        timestamp: new Date().toISOString(),
      };

      await this.messageQueue.publishAnalyticsEvent("chat.message.flagged", flag);
      this.logger.info(`Message flagged: ${messageId} by user ${userId}`);
      return flag;
    } catch (error) {
      this.logger.error("Error flagging message:", error);
      throw error;
    }
  }
}

export default ChatService;
