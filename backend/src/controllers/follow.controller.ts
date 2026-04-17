import Follow from "@models/Follow";
import User from "@models/User";
import Stream from "@models/Stream";
import Notification from "@models/Notification";
import type { Request, Response } from "express";
import { normalizeError } from "../types/error.types";
import { NotFoundError, ValidationError } from "../types/error.types";
import Logger from "@utils/logger";

interface FollowParams {
  userId: string;
}

interface GetFollowersQuery {
  limit?: string;
  skip?: string;
}

const FollowController = {
  // GET /following/live
  getFollowingLive: async (req: Request, res: Response): Promise<void> => {
    try {
      const followerId = req.userId;

      const following = await Follow.find({ followerId }).select("followingId");
      const followingIds = following.map((f) => f.followingId);

      const liveStreams = await Stream.find({
        userId: { $in: followingIds },
        isLive: true,
      }).populate("userId", "username avatar");

      res.json({ success: true, streams: liveStreams });
    } catch (error) {
      Logger.error("Get following live streams error", error);
      const normalizedError = normalizeError(error);
      res
        .status(normalizedError.statusCode)
        .json({ success: false, error: normalizedError });
    }
  },

  // GET /:userId
  getUserById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId).select("-password");

      if (!user) {
        throw new NotFoundError("User not found");
      }

      const totalStreams = await Stream.countDocuments({ userId });
      if (!user.stats) {
        user.stats = {
          totalStreams: 0,
          totalViews: 0,
          totalStreamTime: 0,
          followers: 0,
          following: 0,
        };
      }
      user.stats.totalStreams = totalStreams;

      res.json({ success: true, user });
    } catch (error) {
      Logger.error("Get user error", error);
      const normalizedError = normalizeError(error);
      res
        .status(normalizedError.statusCode)
        .json({ success: false, error: normalizedError });
    }
  },

  // POST /:userId/follow
  followUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const followerId = req.userId;

      if (userId === followerId) {
        throw new ValidationError("Cannot follow yourself");
      }

      const userToFollow = await User.findById(userId);
      if (!userToFollow) {
        throw new NotFoundError("User not found");
      }

      const existingFollow = await Follow.findOne({
        followerId,
        followingId: userId,
      });

      if (existingFollow) {
        throw new ValidationError("Already following this user");
      }

      await Follow.create({
        followerId,
        followingId: userId,
      });

      await User.findByIdAndUpdate(userId, {
        $inc: { "stats.followers": 1 },
      });

      await User.findByIdAndUpdate(followerId, {
        $inc: { "stats.following": 1 },
      });

      const follower =
        await User.findById(followerId).select("username avatar");

      const notification = await Notification.create({
        userId,
        type: "new-follower",
        title: "New Follower",
        message: `${follower?.username} started following you`,
        data: {
          followerId,
          followerUsername: follower?.username,
          followerAvatar: follower?.avatar,
        },
      });

      req.app.get("io").to(`user-${userId}`).emit("notification", notification);

      Logger.info(`User ${followerId} followed user ${userId}`);

      res.json({ success: true, message: "Successfully followed User" });
    } catch (error) {
      Logger.error("Follow error", error);
      const normalizedError = normalizeError(error);
      res
        .status(normalizedError.statusCode)
        .json({ success: false, error: normalizedError });
    }
  },

  // DELETE /:userId/follow
  unfollowUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const followerId = req.userId;

      const follow = await Follow.findOneAndDelete({
        followerId,
        followingId: userId,
      });

      if (!follow) {
        throw new ValidationError("Not following this user");
      }

      await User.findByIdAndUpdate(userId, {
        $inc: { "stats.followers": -1 },
      });

      await User.findByIdAndUpdate(followerId, {
        $inc: { "stats.following": -1 },
      });

      Logger.info(`User ${followerId} unfollowed user ${userId}`);
      res.json({ success: true, message: "Successfully Unfollowed User" });
    } catch (error) {
      Logger.error("Unfollow error", error);
      const normalizedError = normalizeError(error);
      res
        .status(normalizedError.statusCode)
        .json({ success: false, error: normalizedError });
    }
  },

  // GET /:userId/is-following
  checkIsFollowing: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const followerId = req.userId;

      const isFollowing = await Follow.exists({
        followerId,
        followingId: userId,
      });

      res.json({ success: true, isFollowing: !!isFollowing });
    } catch (error) {
      Logger.error("Check following error", error);
      const normalizedError = normalizeError(error);
      res
        .status(normalizedError.statusCode)
        .json({ success: false, error: normalizedError });
    }
  },

  // GET /:userId/followers
  getFollowers: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { limit = "20", skip = "0" } = req.query as GetFollowersQuery;

      const followers = await Follow.find({ followingId: userId })
        .populate(
          "followerId",
          "username avatar stats.followers stats.following",
        )
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      const total = await Follow.countDocuments({ followingId: userId });

      res.json({
        success: true,
        followers: followers.map((f) => f.followerId),
        total,
      });
    } catch (error) {
      Logger.error("Get followers error", error);
      const normalizedError = normalizeError(error);
      res
        .status(normalizedError.statusCode)
        .json({ success: false, error: normalizedError });
    }
  },

  // GET /:userId/following
  getFollowing: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { limit = "20", skip = "0" } = req.query as GetFollowersQuery;

      const following = await Follow.find({ followerId: userId })
        .populate(
          "followingId",
          "username avatar stats.followers stats.following",
        )
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      const total = await Follow.countDocuments({ followerId: userId });

      res.json({
        success: true,
        following: following.map((f) => f.followingId),
        total,
      });
    } catch (error) {
      Logger.error("Get following error", error);
      const normalizedError = normalizeError(error);
      res
        .status(normalizedError.statusCode)
        .json({ success: false, error: normalizedError });
    }
  },
};

export default FollowController;
