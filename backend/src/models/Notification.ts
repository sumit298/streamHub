import mongoose, { Document, Types } from "mongoose";

interface INotification extends Document {
  userId: Types.ObjectId;
  type: "stream-live" | "chat-mention" | "new-follower";
  title: string;
  message: string;
  read: boolean;
  data: {
    streamId?: string;
    streamTitle?: string;
    followerId?: Types.ObjectId;
    followerUsername?: string;
    followerAvatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new mongoose.Schema<INotification>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["stream-live", "chat-mention", "new-follower"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    data: {
      streamId: String,
      streamTitle: String,
      followerId: mongoose.Schema.Types.ObjectId,
      followerUsername: String,
      followerAvatar: String,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

export default mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);
