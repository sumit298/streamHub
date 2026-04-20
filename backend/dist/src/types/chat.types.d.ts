import { Document, Types } from "mongoose";
export type MessageType = "text" | "emoji" | "system" | "gif" | "sticker" | "command";
export type DeleteReason = "spam" | "inappropriate" | "harassment" | "off-topic" | "other" | null;
export interface IReactionEntry {
    userId: Types.ObjectId;
    timestamp: Date;
}
export interface IFlagEntry {
    userId: Types.ObjectId;
    reason: string;
    timestamp: Date;
}
export interface IChatMessage extends Document {
    id: string;
    userId: Types.ObjectId;
    streamId: string;
    content: string;
    mentions: Types.ObjectId[];
    originalContent?: string;
    type: MessageType;
    reactions: Map<string, IReactionEntry[]>;
    edited: boolean;
    editedAt: Date | null;
    editHistory: {
        content: string;
        editedAt: Date;
    }[];
    deleted: boolean;
    deletedAt: Date | null;
    deletedBy: Types.ObjectId | null;
    deletedReason: DeleteReason;
    moderation: {
        flagged: boolean;
        flaggedBy: IFlagEntry[];
        autoModerated: boolean;
        confidence: number | null;
        reasons: string[];
    };
    metadata: {
        userAgent?: string;
        ipHash?: string;
        location?: {
            country?: string;
            region?: string;
        };
        contentLength: number;
        responseToMessageId: string | null;
    };
    analytics: {
        viewCount: number;
        reactionCount: number;
        reportCount: number;
    };
    createdAt: Date;
    updatedAt: Date;
    totalReactions: number;
    addReaction(emoji: string, userId: Types.ObjectId): boolean;
    removeReaction(emoji: string, userId: Types.ObjectId): boolean;
    flagMessage(userId: Types.ObjectId, reason: string): void;
    getSafeMessage(): Record<string, unknown>;
}
