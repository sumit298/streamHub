const express = require("express");
const { Follow, User } = require("../models");
const AuthMiddleWare = require("../middleware/middleware.auth");
const Stream = require("../models/Stream");

module.exports = (logger) => {
  const router = express.Router();

  // follow a user
  router.post(
    "/:userId/follow",
    AuthMiddleWare.authenticate,
    async (req, res) => {
      try {
        const { userId } = req.params;
        const followerId = req.userId;

        if (userId === followerId) {
          return res.status(400).json({
            error: "Cannot follow yourself",
          });
        }

        const userToFollow = await User.findById(userId);
        if (!userToFollow) {
          return res.status(404).json({
            error: "User not found",
          });
        }

        const existingFollow = await Follow.findOne({
          followerId,
          followingId: userId,
        });

        if (existingFollow) {
          return res.status(400).json({
            error: "Already following this user",
          });
        }

        await Follow.create({
          followerId,
          followingId: userId,
        });

        // update follower counts
        await User.findByIdAndUpdate(userId, {
          $inc: { "stats.followers": 1 },
        });

        await User.findByIdAndUpdate(followerId, {
          $inc: { "stats.following": 1 },
        });

        logger.info(`User ${followerId} followed user ${userId}`);

        res.json({ success: true, message: "Successfully followed User" });
      } catch (error) {
        logger.error("Follow error", error);
        res.status(500).json({ error: "Failed to follow user" });
      }
    },
  );

  router.delete(
    "/:userId/follow",
    AuthMiddleWare.authenticate,
    async (req, res) => {
      try {
        const { userId } = req.params;
        const followerId = req.userId;

        const follow = await Follow.findOneAndDelete({
          followerId,
          followingId: userId,
        });

        if (!follow) {
          return res.status(400).json({
            error: "Not following this user",
          });
        }

        await User.findByIdAndUpdate(userId, {
          $inc: { "stats.followers": -1 },
        });

        await User.findByIdAndUpdate(followerId, {
          $inc: { "stats.following": -1 },
        });

        logger.info(`User ${followerId} unfollowed user ${userId}`);
        res.json({ success: true, message: "Successfully Unfollowed User" });
      } catch (error) {
        logger.error("Unfollow error", error);
        res.status(500).json({ error: "Failed to unfollow user" });
      }
    },
  );

  // check if following
  router.get(
    "/:userId/is-following",
    AuthMiddleWare.authenticate,
    async (req, res) => {
      try {
        const { userId } = req.params;
        const followerId = req.userId;

        const isFollowing = await Follow.exists({
          followerId,
          followingId: userId,
        });

        res.json({ success: true, isFollowing: !!isFollowing });
      } catch (error) {
        logger.error("Check following error", error);
        res.status(500).json({ error: "Failed to check follow status" });
      }
    },
  );

  // get followers list
  router.get("/:userId/followers", async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 20, skip = 0 } = req.query;

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
      logger.error("Get followers errors", error);
      res.status(500).json({ error: "Failed to get followers" });
    }
  });

  // get following list
  router.get("/:userId/following", async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 20, skip = 0 } = req.query;

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
      logger.error("Get following error", error);
      res.status(500).json({ error: "Failed to get following" });
    }
  });

  // get followed streamers who are live
  router.get(
    "/following/live",
    AuthMiddleWare.authenticate,
    async (req, res) => {
      try {
        const followerId = req.userId;

        const following = await Follow.find({ followerId }).select(
          "followingId",
        );
        const followingIds = following.map((f) => f.followingId);

        const liveStreams = await Stream.find({
          userId: { $in: followingIds },
          isLive: true,
        }).populate("userId", "username avatar");

        res.json({ success: true, streams: liveStreams });
      } catch (error) {
        logger.error("Get following live streams error", error);
        res.status(500).json({ error: "Failed to get live streams" });
      }
    },
  );
  return router;
};
