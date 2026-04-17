import type { Request, Response } from "express";
import { User, Stream } from "../models/index";
import AuthMiddleware from "@middleware/auth.middleware";
import EmailService from "@services/EmailService";
import type CacheService from "@services/CacheService";
import type R2Service from "@services/R2Service";
import Logger from "@utils/logger";
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { 
  normalizeError, 
  AuthenticationError, 
  NotFoundError, 
  ValidationError,
  DuplicateError 
} from "../types/error.types";

interface RegisterBody {
  username: string;
  email: string;
  password: string;
  role?: "viewer" | "streamer" | "admin";
}

interface LoginBody {
  email: string;
  password: string;
}

interface UpdateProfileBody {
  username?: string;
  bio?: string;
  preferences?: {
    notifications?: boolean;
    privacy?: "public" | "private" | "hidden";
    theme?: "light" | "dark" | "auto";
  };
}

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  token: string;
  password: string;
}

// Extend Request to include optional services
interface AuthenticatedRequest extends Request {
  r2Service?: R2Service;
  cacheService?: CacheService;
}

const AuthController = {
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password, role = 'viewer' } = req.body as RegisterBody;

      // Check for existing user
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        const field = existingUser.email === email ? 'email' : 'username';
        const message = existingUser.email === email 
          ? "Email already registered" 
          : "Username already taken";
        throw new DuplicateError(message, field);
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        role,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`,
      });

      await user.save();

      // Generate token
      const token = AuthMiddleware.createToken({
        id: user._id.toString(),
        username: user.username
      });

      Logger.info(`User ${username} registered successfully`);

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: user.getPublicProfile(),
        token
      });
    } catch (error) {
      Logger.error("Registration error:", error);
      const appError = normalizeError(error);
      res.status(appError.statusCode).json({
        success: false,
        error: {
          message: appError.message,
          code: appError.code,
          statusCode: appError.statusCode
        }
      });
    }
  },

  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as LoginBody;

      // Find user with password field
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new AuthenticationError("Invalid email or password");
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AuthenticationError("Account is not active");
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new AuthenticationError("Invalid email or password");
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = AuthMiddleware.createToken({
        id: user._id.toString(),
        username: user.username
      });

      Logger.info(`User ${user.username} logged in successfully`);

      res.status(200).json({
        success: true,
        message: "Login successful",
        user: user.getPublicProfile(),
        token
      });
    } catch (error) {
      Logger.error("Login error:", error);
      const appError = normalizeError(error);
      res.status(appError.statusCode).json({
        success: false,
        error: {
          message: appError.message,
          code: appError.code,
          statusCode: appError.statusCode
        }
      });
    }
  },

  refreshToken: async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new AuthenticationError("No token found");
      }

      const newToken = AuthMiddleware.refreshToken(token);

      Logger.info("Token refreshed successfully");

      res.status(200).json({
        success: true,
        token: newToken
      });
    } catch (error) {
      Logger.error("Token refresh error:", error);
      const appError = normalizeError(error);
      res.status(appError.statusCode).json({
        success: false,
        error: {
          message: appError.message,
          code: appError.code,
          statusCode: appError.statusCode
        }
      });
    }
  },

  getProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        throw new AuthenticationError("User not authenticated");
      }

      const user = await User.findById(req.userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      res.status(200).json({
        success: true,
        user: user.getSafeProfile()
      });
    } catch (error) {
      Logger.error("Get profile error:", error);
      const appError = normalizeError(error);
      res.status(appError.statusCode).json({
        success: false,
        error: {
          message: appError.message,
          code: appError.code,
          statusCode: appError.statusCode
        }
      });
    }
  },

  updateProfile: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        throw new AuthenticationError("User not authenticated");
      }

      const { username, bio, preferences } = req.body as UpdateProfileBody;
      const user = await User.findById(req.userId);

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Update fields
      if (username !== undefined) user.username = username;
      if (bio !== undefined) user.bio = bio;
      if (preferences !== undefined) {
        user.preferences = { ...user.preferences, ...preferences };
      }

      // Handle avatar upload if file exists
      if (req.file && req.r2Service) {
        const key = `avatars/${req.userId}-${Date.now()}.${req.file.mimetype.split('/')[1]}`;
        const avatarUrl = await req.r2Service.uploadBuffer(
          req.file.buffer,
          key,
          req.file.mimetype
        );
        user.avatar = avatarUrl;
        Logger.info(`Avatar uploaded for user ${req.userId}`);
      }

      await user.save();

      // Clear cache if available
      if (req.cacheService) {
        await req.cacheService.del(`user:${req.userId}`);
      }

      Logger.info(`Profile updated for user ${req.userId}`);

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: user.getPublicProfile()
      });
    } catch (error) {
      Logger.error("Profile update error:", error);
      const appError = normalizeError(error);
      res.status(appError.statusCode).json({
        success: false,
        error: {
          message: appError.message,
          code: appError.code,
          statusCode: appError.statusCode
        }
      });
    }
  },

  getUserStats: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        throw new AuthenticationError("User not authenticated");
      }

      // Get streams for this user
      const streams = await Stream.find({ userId: req.userId });

      // Calculate stats
      const totalStreams = streams.length;
      const totalViews = streams.reduce((sum, s) => sum + ((s as any).stats?.maxViewers || 0), 0);
      const totalStreamTime = streams.reduce((sum, s) => sum + ((s as any).duration || 0), 0);
      const totalChatMessages = streams.reduce((sum, s) => sum + ((s as any).stats?.chatMessages || 0), 0);

      // Get recent streams
      const recentStreams = streams
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map(s => ({
          id: s._id.toString(),
          title: s.title,
          category: s.category,
          views: (s as any).stats?.maxViewers || 0,
          duration: (s as any).duration || 0,
          chatMessages: (s as any).stats?.chatMessages || 0,
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
        recentStreams
      });
    } catch (error) {
      Logger.error("Get user stats error:", error);
      const appError = normalizeError(error);
      res.status(appError.statusCode).json({
        success: false,
        error: {
          message: appError.message,
          code: appError.code,
          statusCode: appError.statusCode
        }
      });
    }
  },

  logout: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Clear cache if available
      if (req.userId && req.cacheService) {
        await req.cacheService.del(`user:${req.userId}`);
      }

      Logger.info(`User ${req.userId} logged out`);

      res.status(200).json({
        success: true,
        message: "Logged out successfully"
      });
    } catch (error) {
      Logger.error("Logout error:", error);
      const appError = normalizeError(error);
      res.status(appError.statusCode).json({
        success: false,
        error: {
          message: appError.message,
          code: appError.code,
          statusCode: appError.statusCode
        }
      });
    }
  },

  forgotPassword: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body as ForgotPasswordBody;

      if (!email) {
        throw new ValidationError("Email is required");
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      
      // Don't reveal if user exists for security
      if (!user) {
        res.status(200).json({
          success: true,
          message: "If the email exists, a reset link has been sent"
        });
        return;
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Store token in cache (Redis) if available
      if (req.cacheService?.client) {
        await req.cacheService.client.setex(`reset:${token}`, 3600, user._id.toString());
      }

      // Send email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await EmailService.sendPasswordReset(user.email, resetUrl);

      Logger.info(`Password reset email sent to ${email}`);

      res.status(200).json({
        success: true,
        message: "If the email exists, a reset link has been sent"
      });
    } catch (error) {
      Logger.error("Forgot password error:", error);
      const appError = normalizeError(error);
      res.status(appError.statusCode).json({
        success: false,
        error: {
          message: appError.message,
          code: appError.code,
          statusCode: appError.statusCode
        }
      });
    }
  },

  resetPassword: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { token, password } = req.body as ResetPasswordBody;

      if (!token || !password) {
        throw new ValidationError("Token and password are required");
      }

      // Validate password strength
      if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        throw new ValidationError(
          "Password must be at least 8 characters and contain at least one uppercase letter and one number"
        );
      }

      // Get userId from cache
      let userId: string | null = null;
      if (req.cacheService?.client) {
        userId = await req.cacheService.client.get(`reset:${token}`);
      }

      if (!userId) {
        throw new ValidationError("Invalid or expired token");
      }

      // Hash new password
      const hashed = await bcrypt.hash(password, 12);
      
      // Update user password
      await User.findByIdAndUpdate(userId, { password: hashed });

      // Delete reset token from cache
      if (req.cacheService?.client) {
        await req.cacheService.client.del(`reset:${token}`);
      }

      Logger.info(`Password reset successful for user ${userId}`);

      res.status(200).json({
        success: true,
        message: "Password reset successful"
      });
    } catch (error) {
      Logger.error("Reset password error:", error);
      const appError = normalizeError(error);
      res.status(appError.statusCode).json({
        success: false,
        error: {
          message: appError.message,
          code: appError.code,
          statusCode: appError.statusCode
        }
      });
    }
  }
};

export default AuthController;
