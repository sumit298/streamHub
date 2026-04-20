"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const vod_controller_1 = __importDefault(require("../controllers/vod.controller"));
const auth_middleware_1 = __importDefault(require("../middleware/auth.middleware"));
const RECORDINGS_ROOT = "/tmp/recordings";
const upload = (0, multer_1.default)({ dest: RECORDINGS_ROOT + "/" });
const router = express_1.default.Router();
// GET /api/vods - Get all VODs
router.get("/", auth_middleware_1.default.authenticate, vod_controller_1.default.getVods);
// POST /api/vods/upload-chunk - Upload recording chunk
router.post("/upload-chunk", auth_middleware_1.default.authenticate, upload.single("chunk"), vod_controller_1.default.uploadChunk);
// POST /api/vods/recording-end - Finalize recording
router.post("/recording-end", auth_middleware_1.default.authenticate, vod_controller_1.default.recordingEnd);
// GET /api/vods/:id - Get specific VOD
router.get("/:id", auth_middleware_1.default.authenticate, vod_controller_1.default.getVodById);
// POST /api/vods/:id/view - Increment view count
router.post("/:id/view", auth_middleware_1.default.authenticate, vod_controller_1.default.incrementView);
exports.default = router;
//# sourceMappingURL=vod.routes.js.map