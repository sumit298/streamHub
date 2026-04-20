"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../models/index");
const auth_middleware_1 = __importDefault(require("../middleware/auth.middleware"));
const EmailService_1 = __importDefault(require("../services/EmailService"));
const logger_1 = __importDefault(require("../utils/logger"));
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const error_types_1 = require("../types/error.types");
const AuthController = {
    register: async (req, res) => {
        try {
            const { username, email, password } = req.body;
            if (typeof email !== "string" ||
                typeof username !== "string" ||
                typeof password !== "string") {
                throw new error_types_1.ValidationError("Invalid registration data");
            }
            // Check for existing user
            const existingUser = await index_1.User.findOne({
                $or: [{ email: { $eq: email } }, { username: { $eq: username } }],
            });
            if (existingUser) {
                const field = existingUser.email === email ? "email" : "username";
                const message = existingUser.email === email
                    ? "Email already registered"
                    : "Username already taken";
                throw new error_types_1.DuplicateError(message, field);
            }
            // Create new user
            const user = new index_1.User({
                username,
                email,
                password,
                role: "viewer",
                avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`,
            });
            await user.save();
            const accessToken = auth_middleware_1.default.createAccessToken({
                id: user._id.toString(),
                username: user.username,
                role: user.role,
            });
            const refreshToken = auth_middleware_1.default.createRefreshToken({
                id: user._id.toString(),
            });
            res.cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 15 * 60 * 1000,
                path: '/',
            });
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/',
            });
            logger_1.default.info(`User ${username} registered successfully`);
            res.status(201).json({
                success: true,
                message: "User created successfully",
                user: user.getPublicProfile(),
            });
        }
        catch (error) {
            logger_1.default.error("Registration error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            if (typeof email !== "string" || typeof password !== "string") {
                throw new error_types_1.ValidationError("Invalid login data");
            }
            // Find user with password field
            const user = await index_1.User.findOne({ email: { $eq: email } }).select("+password");
            if (!user) {
                throw new error_types_1.AuthenticationError("Invalid email or password");
            }
            // Check if user is active
            if (!user.isActive) {
                throw new error_types_1.AuthenticationError("Account is not active");
            }
            // Verify password
            const isValidPassword = await user.comparePassword(password);
            if (!isValidPassword) {
                throw new error_types_1.AuthenticationError("Invalid email or password");
            }
            // Update last login
            user.lastLogin = new Date();
            await user.save();
            const accessToken = auth_middleware_1.default.createAccessToken({
                id: user._id.toString(),
                username: user.username,
                role: user.role,
            });
            const refreshToken = auth_middleware_1.default.createRefreshToken({
                id: user._id.toString(),
            });
            res.cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 15 * 60 * 1000,
                path: '/',
            });
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/',
            });
            logger_1.default.info(`User ${user.username} logged in successfully`);
            res.status(200).json({
                success: true,
                message: "Login successful",
                user: user.getPublicProfile(),
            });
        }
        catch (error) {
            logger_1.default.error("Login error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    refreshToken: async (req, res) => {
        try {
            const token = req.cookies?.refreshToken;
            if (!token) {
                throw new error_types_1.AuthenticationError("No refresh token found");
            }
            const decoded = auth_middleware_1.default.verifyRefreshToken(token);
            // Fetch user to get username and role
            const user = await index_1.User.findById(decoded.userId);
            if (!user || !user.isActive) {
                throw new error_types_1.AuthenticationError("User not found or inactive");
            }
            const newAccessToken = auth_middleware_1.default.createAccessToken({
                id: decoded.userId,
                username: user.username,
                role: user.role,
            });
            res.cookie("accessToken", newAccessToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 15 * 60 * 1000,
                path: '/',
            });
            logger_1.default.info("Token refreshed successfully");
            res.status(200).json({
                success: true,
            });
        }
        catch (error) {
            logger_1.default.error("Token refresh error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    getProfile: async (req, res) => {
        try {
            if (!req.userId) {
                throw new error_types_1.AuthenticationError("User not authenticated");
            }
            const user = await index_1.User.findById(req.userId);
            if (!user) {
                throw new error_types_1.NotFoundError("User not found");
            }
            res.status(200).json({
                success: true,
                user: user.getSafeProfile(),
            });
        }
        catch (error) {
            logger_1.default.error("Get profile error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    updateProfile: async (req, res) => {
        try {
            if (!req.userId) {
                throw new error_types_1.AuthenticationError("User not authenticated");
            }
            const { username, bio, preferences } = req.body;
            const user = await index_1.User.findById(req.userId);
            if (!user) {
                throw new error_types_1.NotFoundError("User not found");
            }
            // Update fields
            if (username !== undefined)
                user.username = username;
            if (bio !== undefined)
                user.bio = bio;
            if (preferences !== undefined) {
                user.preferences = { ...user.preferences, ...preferences };
            }
            // Handle avatar upload if file exists
            if (req.file && req.r2Service) {
                const key = `avatars/${req.userId}-${Date.now()}.${req.file.mimetype.split("/")[1]}`;
                const avatarUrl = await req.r2Service.uploadBuffer(req.file.buffer, key, req.file.mimetype);
                user.avatar = avatarUrl;
                logger_1.default.info(`Avatar uploaded for user ${req.userId}`);
            }
            await user.save();
            // Clear cache if available
            if (req.cacheService) {
                await req.cacheService.del(`user:${req.userId}`);
            }
            logger_1.default.info(`Profile updated for user ${req.userId}`);
            res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                user: user.getPublicProfile(),
            });
        }
        catch (error) {
            logger_1.default.error("Profile update error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    getUserStats: async (req, res) => {
        try {
            if (!req.userId) {
                throw new error_types_1.AuthenticationError("User not authenticated");
            }
            // Get streams for this user
            const streams = await index_1.Stream.find({ userId: req.userId });
            // Calculate stats
            const totalStreams = streams.length;
            const totalViews = streams.reduce((sum, s) => sum + (s.stats?.maxViewers || 0), 0);
            const totalStreamTime = streams.reduce((sum, s) => sum + (s.duration || 0), 0);
            const totalChatMessages = streams.reduce((sum, s) => sum + (s.stats?.chatMessages || 0), 0);
            // Get recent streams
            const recentStreams = streams
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10)
                .map((s) => ({
                id: s._id.toString(),
                title: s.title,
                category: s.category,
                views: s.stats?.maxViewers || 0,
                duration: s.duration || 0,
                chatMessages: s.stats?.chatMessages || 0,
                createdAt: s.createdAt,
                isLive: s.isLive,
            }));
            res.status(200).json({
                success: true,
                stats: {
                    totalStreams,
                    totalViews,
                    totalStreamTime,
                    totalChatMessages,
                },
                recentStreams,
            });
        }
        catch (error) {
            logger_1.default.error("Get user stats error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    logout: async (req, res) => {
        try {
            // Clear cache if available
            if (req.userId && req.cacheService) {
                await req.cacheService.del(`user:${req.userId}`);
            }
            logger_1.default.info(`User ${req.userId} logged out`);
            res.clearCookie("accessToken", {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                path: '/',
            });
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                path: '/',
            });
            res.status(200).json({
                success: true,
                message: "Logged out successfully",
            });
        }
        catch (error) {
            logger_1.default.error("Logout error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                throw new error_types_1.ValidationError("Email is required");
            }
            const user = await index_1.User.findOne({ email: email.toLowerCase() });
            // Don't reveal if user exists for security
            if (!user) {
                res.status(200).json({
                    success: true,
                    message: "If the email exists, a reset link has been sent",
                });
                return;
            }
            // Generate reset token
            const token = crypto_1.default.randomBytes(32).toString("hex");
            // Store token in cache (Redis) if available
            if (req.cacheService?.client) {
                await req.cacheService.client.setex(`reset:${token}`, 3600, user._id.toString());
            }
            // Send email
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
            await EmailService_1.default.sendPasswordReset(user.email, resetUrl);
            logger_1.default.info(`Password reset email sent to ${email}`);
            res.status(200).json({
                success: true,
                message: "If the email exists, a reset link has been sent",
            });
        }
        catch (error) {
            logger_1.default.error("Forgot password error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
    resetPassword: async (req, res) => {
        try {
            const { token, password } = req.body;
            if (!token || !password) {
                throw new error_types_1.ValidationError("Token and password are required");
            }
            // Validate password strength
            if (password.length < 8 ||
                !/[A-Z]/.test(password) ||
                !/[0-9]/.test(password)) {
                throw new error_types_1.ValidationError("Password must be at least 8 characters and contain at least one uppercase letter and one number");
            }
            // Get userId from cache
            let userId = null;
            if (req.cacheService?.client) {
                userId = await req.cacheService.client.get(`reset:${token}`);
            }
            if (!userId) {
                throw new error_types_1.ValidationError("Invalid or expired token");
            }
            // Hash new password
            const hashed = await bcrypt_1.default.hash(password, 12);
            // Update user password
            await index_1.User.findByIdAndUpdate(userId, { password: hashed });
            // Delete reset token from cache
            if (req.cacheService?.client) {
                await req.cacheService.client.del(`reset:${token}`);
            }
            logger_1.default.info(`Password reset successful for user ${userId}`);
            res.status(200).json({
                success: true,
                message: "Password reset successful",
            });
        }
        catch (error) {
            logger_1.default.error("Reset password error:", error);
            const appError = (0, error_types_1.normalizeError)(error);
            res.status(appError.statusCode).json({
                success: false,
                error: {
                    message: appError.message,
                    code: appError.code,
                    statusCode: appError.statusCode,
                },
            });
        }
    },
};
exports.default = AuthController;
//# sourceMappingURL=auth.controller.js.map