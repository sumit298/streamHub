import { Document } from "mongoose";

export interface IUserStats {
  totalStreams: number;
  totalViews: number;
  totalStreamTime: number;
  followers: number;
  following: number;
}

export interface IUserPreferences {
  notifications: boolean;
  privacy: "public" | "private" | "hidden";
  theme: "light" | "dark" | "auto";
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  avatar: string | null;
  bio?: string;
  role: "viewer" | "streamer" | "admin";
  isActive: boolean;
  isVerified: boolean;
  lastLogin: Date | null;
  preferences: IUserPreferences;
  stats: IUserStats;
  createdAt: Date;
  updatedAt: Date;
  // instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPublicProfile(): Record<string, unknown>;
  getSafeProfile(): Record<string, unknown>;
}
