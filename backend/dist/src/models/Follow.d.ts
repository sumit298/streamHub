import mongoose, { Document, Types } from "mongoose";
interface IFollow extends Document {
    followerId: Types.ObjectId;
    followingId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IFollow, {}, {}, {}, mongoose.Document<unknown, {}, IFollow> & IFollow & {
    _id: Types.ObjectId;
}, any>;
export default _default;
