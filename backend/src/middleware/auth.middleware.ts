import User from "@models/User";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { Socket } from "socket.io";
import Logger from "@utils/logger";

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET environment variable is required in production",
    );
  }
  Logger.warn("JWT_SECRET environment variable is not set.");
}

interface JWTPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    role: "viewer" | "streamer" | "admin";
  };
}

class AuthMiddleWare {
  static async authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token) {
        res.status(401).json({ message: "Not authenticated" });
        return;
      }

      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET as string,
        ) as JWTPayload;

        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
          res.status(401).json({ message: "User not found or inactive." });
          return;
        }

        if (decoded.exp * 1000 < Date.now()) {
          res.status(401).json({ message: "Token expired." });
          return;
        }

        req.userId = decoded.userId;

        req.user = {
          id: decoded.userId,
          username: decoded.username,
          email: user.email,
          role: user.role || "viewer",
        };

        next();
      } catch (jwtError) {
        if (
          jwtError instanceof Error &&
          jwtError.name === "TokenExpiredError"
        ) {
          res.status(401).json({ error: "Token expired." });
          return;
        } else if (
          jwtError instanceof Error &&
          jwtError.name === "JsonWebTokenError"
        ) {
          res.status(401).json({ error: "Invalid token." });
          return;
        } else {
          throw jwtError;
        }
      }
    } catch (error) {
      Logger.error("Authentication error:", error);
      res.status(500).json({ error: "Authentication service error." });
    }
  }

  static socketAuth(
    socket: AuthenticatedSocket,
    next: (err?: Error) => void,
  ): void {
    try {
      const token = socket.handshake.auth.token;
      
      Logger.info(`[AUTH] Token found: ${!!token}`);
      Logger.info(`[AUTH] Raw token (first 50): ${token?.substring(0, 50)}`);
      Logger.info(`[AUTH] Token length: ${token?.length}`);
      Logger.info(`[AUTH] Full auth object: ${JSON.stringify(socket.handshake.auth)}`);

      if (!token) {
        Logger.warn(`[AUTH] No token for socket: ${socket.id} - allowing unauthenticated connection`);
        socket.userId = undefined;
        socket.user = undefined;
        return next();
      }

      jwt.verify(
        token,
        process.env.JWT_SECRET as string,
        async (
          err: jwt.VerifyErrors | null,
          decoded: string | jwt.JwtPayload | undefined,
        ) => {
          if (err) {
            Logger.error(`[AUTH] Token verify failed: ${err.message}`);
            return next(new Error("Invalid token"));
          }

          const payload = decoded as JWTPayload;
          Logger.info(`[AUTH] Token decoded - userId: ${payload.userId}, username: ${payload.username}`);

          try {
            const user = await User.findById(payload.userId);
            if (!user || !user.isActive) {
              Logger.warn(`[AUTH] User not found: ${payload.userId}`);
              return next(new Error("User not found or inactive"));
            }

            socket.userId = payload.userId;
            socket.user = {
              id: payload.userId,
              username: payload.username,
              email: user.email,
              role: user.role || "viewer",
            };
            
            socket.data.userId = payload.userId;
            socket.data.username = payload.username;
            socket.data.user = {
              id: payload.userId,
              username: payload.username,
              email: user.email,
              role: user.role || "viewer",
            };
            
            Logger.info(`[AUTH] SUCCESS - socket.userId: ${socket.userId}, socket.data.username: ${socket.data.username}`);

            next();
          } catch (dbError) {
            Logger.error("Socket auth database error:", dbError);
            return next(new Error("Authentication failed"));
          }
        },
      );
    } catch (error) {
      Logger.error("Socket authentication error:", error);
      return next(new Error("Authentication failed"));
    }
  }

  static requiredRoles(roles: string | string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const userRole = req.user.role || "viewer";
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (allowedRoles.includes(userRole)) {
        next();
      } else {
        res.status(403).json({ error: "Access denied" });
      }
    };
  }

  static requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    next();
  }

  static requireStreamer(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (req.user.role !== "streamer" && req.user.role !== "admin") {
      res.status(403).json({ error: "Streamer access required" });
      return;
    }

    next();
  }

  static requireStreamOwnership(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    // This middleware should be used after authenticate
    // It will be implemented in the route handler since it needs stream data
    next();
  }

  static createAccessToken(user: {
    id: string;
    username: string;
    role?: string;
  }) {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role || "viewer",
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "15m",
        issuer: "ils-platform",
        audience: "ils-users",
      },
    );
  }

  static createRefreshToken(user: { id: string }) {
    return jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });
  }

  static verifyRefreshToken(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET as string) as any;
  }
}

export default AuthMiddleWare;
