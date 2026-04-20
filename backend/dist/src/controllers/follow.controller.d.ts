import type { Request, Response } from "express";
declare const FollowController: {
    getFollowingLive: (req: Request, res: Response) => Promise<void>;
    getUserById: (req: Request, res: Response) => Promise<void>;
    followUser: (req: Request, res: Response) => Promise<void>;
    unfollowUser: (req: Request, res: Response) => Promise<void>;
    checkIsFollowing: (req: Request, res: Response) => Promise<void>;
    getFollowers: (req: Request, res: Response) => Promise<void>;
    getFollowing: (req: Request, res: Response) => Promise<void>;
};
export default FollowController;
