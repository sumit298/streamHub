import type { Request, Response } from "express";
import type CacheService from "../services/CacheService";
import type R2Service from "../services/R2Service";
interface AuthenticatedRequest extends Request {
    r2Service?: R2Service;
    cacheService?: CacheService;
}
declare const AuthController: {
    register: (req: Request, res: Response) => Promise<void>;
    login: (req: Request, res: Response) => Promise<void>;
    refreshToken: (req: Request, res: Response) => Promise<void>;
    getProfile: (req: Request, res: Response) => Promise<void>;
    updateProfile: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getUserStats: (req: Request, res: Response) => Promise<void>;
    logout: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    forgotPassword: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    resetPassword: (req: AuthenticatedRequest, res: Response) => Promise<void>;
};
export default AuthController;
