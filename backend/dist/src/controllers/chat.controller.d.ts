import type { Request, Response } from "express";
import type ChatService from "../services/ChatService";
declare const ChatController: {
    getMessages: (chatService: ChatService) => (req: Request, res: Response) => Promise<void>;
    sendMessage: (chatService: ChatService) => (req: Request, res: Response) => Promise<void>;
    deleteMessage: (chatService: ChatService) => (req: Request, res: Response) => Promise<void>;
    addReaction: (chatService: ChatService) => (req: Request, res: Response) => Promise<void>;
    moderateMessage: (chatService: ChatService) => (req: Request, res: Response) => Promise<void>;
    getChatStats: (chatService: ChatService) => (req: Request, res: Response) => Promise<void>;
    flagMessage: (chatService: ChatService) => (req: Request, res: Response) => Promise<void>;
};
export default ChatController;
