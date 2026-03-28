import mongoose, { Document, Types } from "mongoose";

interface IVOD extends Document {
  streamId: string;
  userId: Types.ObjectId;
  title: string;
  description?: string;
  category?: string;
  thumbnail?: string;

  filename?: string;
  fileSize?: number;
  duration?: number;

  r2Key: string;

  status: "recording" | "processing" | "ready" | "failed";
  views: number;
  recordedAt: Date;
}

const vodSchema = new mongoose.Schema<IVOD>(
  {
    streamId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    category: String,
    thumbnail: String,

    filename: String,
    fileSize: Number,
    duration: Number,

    r2Key: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["recording", "processing", "ready", "failed"],
      default: "recording",
      index: true,
    },
    views: { type: Number, default: 0 },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

vodSchema.index({ userId: 1, createdAt: -1 });
vodSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IVOD>("VOD", vodSchema);
