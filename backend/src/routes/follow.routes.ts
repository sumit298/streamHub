import express from "express";
import AuthMiddleware from "@middleware/auth.middleware";
import FollowController from "@controllers/follow.controller";

const router = express.Router();

// Get followed streamers who are live
router.get(
  "/following/live",
  AuthMiddleware.authenticate,
  FollowController.getFollowingLive
);

// Get user by id
router.get("/:userId", FollowController.getUserById);

// Follow a user
router.post(
  "/:userId/follow",
  AuthMiddleware.authenticate,
  FollowController.followUser
);

// Unfollow a user
router.delete(
  "/:userId/follow",
  AuthMiddleware.authenticate,
  FollowController.unfollowUser
);

// Check if following
router.get(
  "/:userId/is-following",
  AuthMiddleware.authenticate,
  FollowController.checkIsFollowing
);

// Get followers list
router.get("/:userId/followers", FollowController.getFollowers);

// Get following list
router.get("/:userId/following", FollowController.getFollowing);

export default router;
