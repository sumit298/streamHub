"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Follow_1 = __importDefault(require("../models/Follow"));
const User_1 = __importDefault(require("../models/User"));
const Stream_1 = __importDefault(require("../models/Stream"));
const Notification_1 = __importDefault(require("../models/Notification"));
const error_types_1 = require("../types/error.types");
const error_types_2 = require("../types/error.types");
const logger_1 = __importDefault(require("../utils/logger"));
const FollowController = {
    // GET /following/live
    getFollowingLive: async (req, res) => {
        try {
            const followerId = req.userId;
            const following = await Follow_1.default.find({ followerId }).select("followingId");
            const followingIds = following.map((f) => f.followingId);
            const liveStreams = await Stream_1.default.find({
                userId: { $in: followingIds },
                isLive: true,
            }).populate("userId", "username avatar");
            res.json({ success: true, streams: liveStreams });
        }
        catch (error) {
            logger_1.default.error("Get following live streams error", error);
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
    // GET /:userId
    getUserById: async (req, res) => {
        try {
            const { userId } = req.params;
            const user = await User_1.default.findById(userId).select("-password");
            if (!user) {
                throw new error_types_2.NotFoundError("User not found");
            }
            const totalStreams = await Stream_1.default.countDocuments({ userId });
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
        }
        catch (error) {
            logger_1.default.error("Get user error", error);
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
    // POST /:userId/follow
    followUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const followerId = req.userId;
            if (userId === followerId) {
                throw new error_types_2.ValidationError("Cannot follow yourself");
            }
            const userToFollow = await User_1.default.findById(userId);
            if (!userToFollow) {
                throw new error_types_2.NotFoundError("User not found");
            }
            const existingFollow = await Follow_1.default.findOne({
                followerId,
                followingId: userId,
            });
            if (existingFollow) {
                throw new error_types_2.ValidationError("Already following this user");
            }
            await Follow_1.default.create({
                followerId,
                followingId: userId,
            });
            await User_1.default.findByIdAndUpdate(userId, {
                $inc: { "stats.followers": 1 },
            });
            await User_1.default.findByIdAndUpdate(followerId, {
                $inc: { "stats.following": 1 },
            });
            const follower = await User_1.default.findById(followerId).select("username avatar");
            const notification = await Notification_1.default.create({
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
            logger_1.default.info(`User ${followerId} followed user ${userId}`);
            res.json({ success: true, message: "Successfully followed User" });
        }
        catch (error) {
            logger_1.default.error("Follow error", error);
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
    // DELETE /:userId/follow
    unfollowUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const followerId = req.userId;
            const follow = await Follow_1.default.findOneAndDelete({
                followerId,
                followingId: userId,
            });
            if (!follow) {
                throw new error_types_2.ValidationError("Not following this user");
            }
            await User_1.default.findByIdAndUpdate(userId, {
                $inc: { "stats.followers": -1 },
            });
            await User_1.default.findByIdAndUpdate(followerId, {
                $inc: { "stats.following": -1 },
            });
            logger_1.default.info(`User ${followerId} unfollowed user ${userId}`);
            res.json({ success: true, message: "Successfully Unfollowed User" });
        }
        catch (error) {
            logger_1.default.error("Unfollow error", error);
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
    // GET /:userId/is-following
    checkIsFollowing: async (req, res) => {
        try {
            const { userId } = req.params;
            const followerId = req.userId;
            const isFollowing = await Follow_1.default.exists({
                followerId,
                followingId: userId,
            });
            res.json({ success: true, isFollowing: !!isFollowing });
        }
        catch (error) {
            logger_1.default.error("Check following error", error);
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
    // GET /:userId/followers
    getFollowers: async (req, res) => {
        try {
            const { userId } = req.params;
            const { limit = "20", skip = "0" } = req.query;
            const followers = await Follow_1.default.find({ followingId: userId })
                .populate("followerId", "username avatar stats.followers stats.following")
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(parseInt(skip));
            const total = await Follow_1.default.countDocuments({ followingId: userId });
            res.json({
                success: true,
                followers: followers.map((f) => f.followerId),
                total,
            });
        }
        catch (error) {
            logger_1.default.error("Get followers error", error);
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
    // GET /:userId/following
    getFollowing: async (req, res) => {
        try {
            const { userId } = req.params;
            const { limit = "20", skip = "0" } = req.query;
            const following = await Follow_1.default.find({ followerId: userId })
                .populate("followingId", "username avatar stats.followers stats.following")
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(parseInt(skip));
            const total = await Follow_1.default.countDocuments({ followerId: userId });
            res.json({
                success: true,
                following: following.map((f) => f.followingId),
                total,
            });
        }
        catch (error) {
            logger_1.default.error("Get following error", error);
            const normalizedError = (0, error_types_1.normalizeError)(error);
            res
                .status(normalizedError.statusCode)
                .json({ success: false, error: normalizedError });
        }
    },
};
exports.default = FollowController;
//# sourceMappingURL=follow.controller.js.map