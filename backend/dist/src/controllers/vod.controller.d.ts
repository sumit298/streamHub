import R2Service from "../services/R2Service";
import type { Request, Response } from "express";
interface VodRequest extends Request {
    r2Service?: R2Service;
}
declare const VodController: {
    getVods: (req: Request, res: Response) => Promise<void>;
    getVodById: (req: VodRequest, res: Response) => Promise<void>;
    incrementView: (req: Request, res: Response) => Promise<void>;
    uploadChunk: (req: Request, res: Response) => Promise<void>;
    recordingEnd: (req: Request, res: Response) => Promise<void>;
};
export default VodController;
