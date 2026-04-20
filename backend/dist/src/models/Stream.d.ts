import mongoose from "mongoose";
import type { IStream } from "../types/stream.types";
declare const _default: mongoose.Model<IStream, {}, {}, {}, mongoose.Document<unknown, {}, IStream> & IStream & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
