import type { INotification } from "@appTypes/notification.types";
import mongoose from "mongoose";

export const NOTIFICATION_TYPES = ["stream-live", "chat-mention", "new-follower"] as const;


const notificationSchema = new mongoose.Schema<INotification>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxLength: 140
    },
    message: {
      type: String,
      required: true,
      maxLength: 300
    },
    readAt: {
      type: Date,
      default: null,
    },
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: String,
      avatar: String,
    },
    target: {
      streamId: String,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      streamTitle: String,
      streamCategory: String,
    },
    deduplicationKey: {
      required: true,
      type: String,
    },
  },
  {
    timestamps: true,
  },
);
// One notification per recipient per event (this is what stops duplicates)
notificationSchema.index({ userId: 1, deduplicationKey: 1 }, { unique: true });
// Newest first. A Mongo _id contains its creation time, so sorting by _id = sorting by date.
notificationSchema.index({ userId: 1, _id: -1 });
// Activity tabs (Live / Mentions / Follows)
notificationSchema.index({ userId: 1, type: 1, _id: -1 });
// Unread count
notificationSchema.index({ userId: 1, readAt: 1 });
// Delete read notifications 30 days after reading. Unread ones (readAt = null) are kept.
notificationSchema.index({ readAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

notificationSchema.methods.getPublicInfo = function () {
  return {
    id: String(this._id),
    type: this.type,
    title: this.title,
    message: this.message,
    actor: this.actor?.id 
      ? {
        id: String(this.actor.id),
        username: this.actor.username,
        avatar: this.actor.avatar || null,
      }: null,
    target: {
      streamId: this.target.streamId,
      userId: this.target.userId ? String(this.target.userId) : undefined,
      streamTitle: this.target.streamTitle,
      streamCategory: this.target.streamCategory,
    },
    readAt: this.readAt ? this.readAt.toISOString() : null,
    createdAt: this.createdAt.toISOString(),
  }
}
export default mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);
