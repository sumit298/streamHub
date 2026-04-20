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
declare const _default: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification> & INotification & {
    _id: Types.ObjectId;
}, any>;
export default _default;
