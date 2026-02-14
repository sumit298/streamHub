const mongoose = require("mongoose");

const vodSchema = new mongoose.Schema(
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

module.exports = mongoose.model("VOD", vodSchema);
