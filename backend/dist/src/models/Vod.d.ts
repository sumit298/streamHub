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
declare const _default: mongoose.Model<IVOD, {}, {}, {}, mongoose.Document<unknown, {}, IVOD> & IVOD & {
    _id: Types.ObjectId;
}, any>;
export default _default;
