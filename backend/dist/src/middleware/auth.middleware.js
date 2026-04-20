"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../utils/logger"));
if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET environment variable is required in production");
    }
    logger_1.default.warn("JWT_SECRET environment variable is not set.");
}
class AuthMiddleWare {
    static async authenticate(req, res, next) {
        try {
            // Try cookie first (more secure), then header (fallback)
            const token = req.cookies.accessToken;
            if (!token) {
                res.status(401).json({ message: "Not authenticated" });
                return;
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                const user = await User_1.default.findById(decoded.userId);
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
            }
            catch (jwtError) {
                if (jwtError instanceof Error &&
                    jwtError.name === "TokenExpiredError") {
                    res.status(401).json({ error: "Token expired." });
                    return;
                }
                else if (jwtError instanceof Error &&
                    jwtError.name === "JsonWebTokenError") {
                    res.status(401).json({ error: "Invalid token." });
                    return;
                }
                else {
                    throw jwtError;
                }
            }
        }
        catch (error) {
            logger_1.default.error("Authentication error:", error);
            res.status(500).json({ error: "Authentication service error." });
        }
    }
    static socketAuth(socket, next) {
        try {
            // Try cookie first (web), then auth query param (mobile)
            const cookieToken = socket.request.headers.cookie
                ?.split(";")
                .find((c) => c.trim().startsWith("accessToken="))
                ?.split("=")[1];
            const token = cookieToken || socket.handshake.auth.token;
            logger_1.default.info(`[AUTH] Token found: ${!!token}`);
            if (!token) {
                logger_1.default.warn(`[AUTH] No token for socket: ${socket.id} - allowing unauthenticated connection`);
                socket.userId = undefined;
                socket.user = undefined;
                return next();
            }
            jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
                if (err) {
                    logger_1.default.error(`[AUTH] Token verify failed: ${err.message}`);
                    return next(new Error("Invalid token"));
                }
                const payload = decoded;
                logger_1.default.info(`[AUTH] Token decoded - userId: ${payload.userId}, username: ${payload.username}`);
                try {
                    const user = await User_1.default.findById(payload.userId);
                    if (!user || !user.isActive) {
                        logger_1.default.warn(`[AUTH] User not found: ${payload.userId}`);
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
                    logger_1.default.info(`[AUTH] SUCCESS - socket.userId: ${socket.userId}, socket.data.username: ${socket.data.username}`);
                    next();
                }
                catch (dbError) {
                    logger_1.default.error("Socket auth database error:", dbError);
                    return next(new Error("Authentication failed"));
                }
            });
        }
        catch (error) {
            logger_1.default.error("Socket authentication error:", error);
            return next(new Error("Authentication failed"));
        }
    }
    static requiredRoles(roles) {
        return (req, res, next) => {
            if (!req.user) {
                res.status(401).json({ error: "Authentication required" });
                return;
            }
            const userRole = req.user.role || "viewer";
            const allowedRoles = Array.isArray(roles) ? roles : [roles];
            if (allowedRoles.includes(userRole)) {
                next();
            }
            else {
                res.status(403).json({ error: "Access denied" });
            }
        };
    }
    static requireAdmin(req, res, next) {
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
    static requireStreamer(req, res, next) {
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
    static requireStreamOwnership(req, res, next) {
        // This middleware should be used after authenticate
        // It will be implemented in the route handler since it needs stream data
        next();
    }
    static createAccessToken(user) {
        return jsonwebtoken_1.default.sign({
            userId: user.id,
            username: user.username,
            role: user.role || "viewer",
        }, process.env.JWT_SECRET, {
            expiresIn: "15m",
            issuer: "ils-platform",
            audience: "ils-users",
        });
    }
    static createRefreshToken(user) {
        return jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });
    }
    static verifyRefreshToken(token) {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    }
}
exports.default = AuthMiddleWare;
//# sourceMappingURL=auth.middleware.js.map