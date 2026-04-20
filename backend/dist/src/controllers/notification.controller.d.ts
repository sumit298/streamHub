import type { Request, Response } from "express";
declare const NotificationController: {
    getAllNotifications: (req: Request, res: Response) => Promise<void>;
    markAsRead: (req: Request, res: Response) => Promise<void>;
    markAllAsRead: (req: Request, res: Response) => Promise<void>;
};
export default NotificationController;
