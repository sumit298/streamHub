import type { Request, Response } from "express";
import type StreamService from "../services/StreamService";
import type CacheService from "../services/CacheService";
declare const StreamController: {
    getStreams: (streamService: StreamService, cacheService: CacheService) => (req: Request, res: Response) => Promise<void>;
    createStream: (streamService: StreamService, cacheService: CacheService) => (req: Request, res: Response) => Promise<void>;
    getStreamById: (streamService: StreamService, cacheService: CacheService) => (req: Request, res: Response) => Promise<void>;
    endStream: (streamService: StreamService, cacheService: CacheService) => (req: Request, res: Response) => Promise<void>;
    updateStream: (streamService: StreamService, cacheService: CacheService) => (req: Request, res: Response) => Promise<void>;
    deleteStream: (streamService: StreamService, cacheService: CacheService) => (req: Request, res: Response) => Promise<void>;
    joinStream: (streamService: StreamService) => (req: Request, res: Response) => Promise<void>;
    getViewers: () => (req: Request, res: Response) => Promise<void>;
    getStreamStats: (streamService: StreamService) => (req: Request, res: Response) => Promise<void>;
    getUserStreams: (streamService: StreamService) => (req: Request, res: Response) => Promise<void>;
};
export default StreamController;
