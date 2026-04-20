import { Request, Response, NextFunction } from "express";
import { Socket } from "socket.io";
interface AuthenticatedSocket extends Socket {
    userId?: string;
    user?: {
        id: string;
        username: string;
        email: string;
        role: "viewer" | "streamer" | "admin";
    };
}
declare class AuthMiddleWare {
    static authenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
    static socketAuth(socket: AuthenticatedSocket, next: (err?: Error) => void): void;
    static requiredRoles(roles: string | string[]): (req: Request, res: Response, next: NextFunction) => void;
    static requireAdmin(req: Request, res: Response, next: NextFunction): void;
    static requireStreamer(req: Request, res: Response, next: NextFunction): void;
    static requireStreamOwnership(req: Request, res: Response, next: NextFunction): void;
    static createAccessToken(user: {
        id: string;
        username: string;
        role?: string;
    }): string;
    static createRefreshToken(user: {
        id: string;
    }): string;
    static verifyRefreshToken(token: string): any;
}
export default AuthMiddleWare;
