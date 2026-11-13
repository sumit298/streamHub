import { Document, Types } from "mongoose";

export type NotificationType = "stream-live" | "chat-mention" | "new-follower";

export interface INotificationActor {
  id: Types.ObjectId;
  username: string;
  avatar?: string;
}

export interface INotificationTarget {
  streamId?: string;
  userId?: Types.ObjectId;
  streamTitle?: string;
  streamCategory?: string;
}

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // recipient
  type: NotificationType;
  title: string;
  message: string;
  actor?: INotificationActor;
  target: INotificationTarget;
  deduplicationKey: string;
  readAt: Date | null; // null = unread
  createdAt: Date;
  updatedAt: Date;
  getPublicInfo(): NotificationDTO
}

// What producers pass to NotificationService.notify()
export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  deduplicationKey: string;
  actor?: { id: string; username: string; avatar?: string };
  target: {
    streamId?: string;
    userId?: string;
    streamTitle?: string;
    streamCategory?: string;
  };
}

export interface NotificationListOptions {
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actor: { id: string; username: string; avatar: string | null } | null;
  target: {
    streamId?: string;
    userId?: string;
    streamTitle?: string;
    streamCategory?: string;
  };
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResult {
  items: NotificationDTO[];
  nextCursor: string | null;
  unreadCount: number;
}
