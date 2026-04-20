import { Document, Types } from "mongoose";

export type StreamCategory =
  | "gaming"
  | "music"
  | "art"
  | "technology"
  | "education"
  | "entertainment"
  | "sports"
  | "general";
export type StreamQuality = "low" | "medium" | "high" | "ultra";

export interface IStreamStats {
  viewers: number;
  maxViewers: number;
  totalViews: number;
  chatMessages: number;
  likes: number;
  shares: number;
}

export interface IStreamSettings {
  quality: StreamQuality;
  maxBitrate: number;
  framerate: 15 | 30 | 60;
}

export interface IStream extends Document {
  id: string;
  userId: Types.ObjectId;
  streamUserName?: string;
  title: string;
  description?: string;
  category: StreamCategory;
  tags: string[];
  isLive: boolean;
  isPending: boolean;
  thumbnail: string | null;
  chatEnabled: boolean;
  recordingEnabled: boolean;
  recordingUrl: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  duration: number;
  stats: IStreamStats;
  settings: IStreamSettings;
  createdAt: Date;
  updatedAt: Date;
  // virtuals
  formattedDuration: string;
  // instance methods
//   canUserView(userId: Types.ObjectId | string): boolean;
  getPublicInfo(): Record<string, unknown>;
}
