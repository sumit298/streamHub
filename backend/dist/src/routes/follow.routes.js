"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = __importDefault(require("../middleware/auth.middleware"));
const follow_controller_1 = __importDefault(require("../controllers/follow.controller"));
const router = express_1.default.Router();
// Get followed streamers who are live
router.get("/following/live", auth_middleware_1.default.authenticate, follow_controller_1.default.getFollowingLive);
// Get user by id
router.get("/:userId", follow_controller_1.default.getUserById);
// Follow a user
router.post("/:userId/follow", auth_middleware_1.default.authenticate, follow_controller_1.default.followUser);
// Unfollow a user
router.delete("/:userId/follow", auth_middleware_1.default.authenticate, follow_controller_1.default.unfollowUser);
// Check if following
router.get("/:userId/is-following", auth_middleware_1.default.authenticate, follow_controller_1.default.checkIsFollowing);
// Get followers list
router.get("/:userId/followers", follow_controller_1.default.getFollowers);
// Get following list
router.get("/:userId/following", follow_controller_1.default.getFollowing);
exports.default = router;
//# sourceMappingURL=follow.routes.js.map