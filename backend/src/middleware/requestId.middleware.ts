import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

const requestMiddleware = (req: Request, res: Response, next: NextFunction)=> {
    req.requestId = uuidv4();
    res.setHeader('X-Request-ID', req.requestId);
    next();
}

export default requestMiddleware;