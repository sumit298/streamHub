import type { Server as SocketIOServer } from "socket.io";
import type { Logger } from "winston";
import { isValidObjectId, Types } from "mongoose";
import { User, Notification } from "@models/index";
import type { NotifyInput, NotificationListOptions, NotificationListResult, NotifyOutcome, UnreadCountByType, NotifyBatchSummary, NotificationType } from "@appTypes/notification.types";
import { isMongoError, ValidationError } from "@appTypes/error.types";


export const userRoom = (userId: string): string => `user:${userId}`;

class NotificationService {
    private io: SocketIOServer;
    private logger: Logger;

    constructor(io: SocketIOServer, logger: Logger) {
        this.io = io;
        this.logger = logger;
    }

    async notify(input: NotifyInput): Promise<NotifyOutcome> {
        if (input.actor && input.actor.id === input.userId) {
            return 'skipped'; // Don't notify users about their own actions
        }

        try {

            const user = await User.findById(input.userId).select("preferences").lean();
            if (!user || user.preferences?.notifications === false) {
                return 'skipped'; // User doesn't exist or has disabled notifications
            }

            const notification = await Notification.create(input);
            this.io.to(userRoom(input.userId)).emit("notification:new", notification.getPublicInfo());
            await this.sendCount(input.userId);
            return 'sent'
        } catch (error) {
            if (isMongoError(error) && error.code === 11000) return 'duplicate';
            this.logger.error(`[NOTIFICATION] notify failed for user ${input.userId}`, error);
            return 'failed'

        }

    }

    async notifyMany(inputs: NotifyInput[]): Promise<NotifyBatchSummary> {
        const summary: NotifyBatchSummary = {
            type: inputs[0]?.type ?? null,
            total: inputs?.length,
            sent: 0,
            skipped: 0,
            duplicate: 0,
            failed: 0
        }

        for (const input of inputs) {
            const outcome = await this.notify(input);
            summary[outcome] += 1;
        }

        if (inputs?.length > 0) {
            this.logger.info("[NOTIFICATION] batch summary", summary);
        }
        return summary;

    }

    async unreadCount(userId: string): Promise<number> {
        return Notification.countDocuments({ userId, readAt: null });
    }

    async sendCount(userId: string): Promise<void> {
        const unread = await this.unreadCount(userId);
        const unreadByType = await this.unreadCountByType(userId);
        this.io.to(userRoom(userId)).emit("notification:count", { unread, unreadByType });
    }

    async unreadCountByType(userId: string): Promise<UnreadCountByType> {
        const unreadByType: UnreadCountByType = {
            "stream-live": 0,
            "chat-mention": 0,
            "new-follower": 0,
        };

        // aggregate() does not convert the string id for us, unlike find()
        const typeGroups = await Notification.aggregate<{ _id: NotificationType; count: number }>([
            { $match: { userId: new Types.ObjectId(userId), readAt: null } },
            { $group: { _id: "$type", count: { $sum: 1 } } },
        ]);

        for (const typeGroup of typeGroups) {
            unreadByType[typeGroup._id] = typeGroup.count;
        }

        return unreadByType;
    }

    async list(
        userId: string,
        options: NotificationListOptions
    ): Promise<NotificationListResult> {
        const limit = Math.min(Math.max(options.limit || 20, 1), 50);

        const query: Record<string, unknown> = { userId };
        if (options.unreadOnly) query.readAt = null;
        if (options.type) query.type = options.type;
        if (options.cursor) {
            if (!isValidObjectId(options.cursor)) {
                throw new ValidationError("Invalid cursor");
            }
            query._id = { $lt: options.cursor };
        }
        const notifications = await Notification.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1);

        const hasMore = notifications.length > limit;
        const items = notifications
            .slice(0, limit)
            .map((notification) => notification.getPublicInfo());


        return {
            items,
            nextCursor: hasMore ? items[items.length - 1].id : null,
            unreadCount: await this.unreadCount(userId),
        }
    }

    async markRead(userId: string, notificationIds: string[] | "all"): Promise<{ updated: number }> {
        const filter: Record<string, unknown> = { userId, readAt: null };
        if (notificationIds !== "all") {
            filter._id = {
                $in: notificationIds.filter((notificationId) => isValidObjectId(notificationId)),
            };
        }

        const result = await Notification.updateMany(filter, { readAt: new Date() });

        // Tell all of this user's tabs to refresh
        this.io.to(userRoom(userId)).emit("notification:read");
        await this.sendCount(userId);

        return { updated: result.modifiedCount };
    }
}

export default NotificationService;
