import type { Server as SocketIOServer } from "socket.io";
import type { Logger } from "winston";
import { isValidObjectId } from "mongoose";
import { User, Notification } from "@models/index";
import type { NotifyInput, NotificationListOptions, NotificationListResult } from "@appTypes/notification.types";
import { isMongoError } from "@appTypes/error.types";


export const userRoom = (userId: string): string => `user:${userId}`;

class NotificationService {
    private io: SocketIOServer;
    private logger: Logger;

    constructor(io: SocketIOServer, logger: Logger) {
        this.io = io;
        this.logger = logger;
    }

    async notify(input: NotifyInput): Promise<void> {
        if (input.actor && input.actor.id === input.userId) {
            return; // Don't notify users about their own actions
        }

        try { 
            const user = await User.findById(input.userId).select("preferences").lean();
            if (!user || !user.preferences.notifications) {
                return; // User doesn't exist or has disabled notifications
            }

            const doc = await Notification.create(input);
            this.io.to(userRoom(input.userId)).emit("notification", doc.getPublicInfo());
            await this.sendCount(input.userId);
        } catch (error) {
            if (isMongoError(error) && error.code === 11000) return;
            this.logger.error(`[NOTIFICATION] notify failed for user ${input.userId}`, error);

        }

    }

    async notifyMany(inputs: NotifyInput[]): Promise<void> {
        for (const input of inputs) {
            await this.notify(input);
        }

    }

    async unreadCount(userId: string): Promise<number> {
        return Notification.countDocuments({ userId, readAt: null });
    }

    async sendCount(userId: string): Promise<void> {
        const unread = await this.unreadCount(userId)
        this.io.to(userRoom(userId)).emit("notification:count", { unread });
    }

    // async list(
    //     userId: string,
    //     options: NotificationListOptions
    // ): Promise<NotificationListResult> {
    //     const limit = Math.min(Math.max)
    // }
}

