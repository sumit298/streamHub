import mongoose, { Types } from "mongoose";
import type { IChatMessage } from "../types/chat.types";
declare const _default: mongoose.Model<IChatMessage, {}, {}, {}, mongoose.Document<unknown, {}, IChatMessage> & IChatMessage & {
    _id: Types.ObjectId;
}, any>;
export default _default;
