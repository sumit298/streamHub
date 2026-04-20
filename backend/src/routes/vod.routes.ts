import express, { Router } from "express";
import multer from "multer";
import VodController from "@controllers/vod.controller";
import AuthMiddleWare from "@middleware/auth.middleware";

const RECORDINGS_ROOT = "/tmp/recordings";
const upload = multer({ dest: RECORDINGS_ROOT + "/" });

const router: Router = express.Router();

// GET /api/vods - Get all VODs
router.get("/", AuthMiddleWare.authenticate, VodController.getVods);

// POST /api/vods/upload-chunk - Upload recording chunk
router.post("/upload-chunk", AuthMiddleWare.authenticate, upload.single("chunk"), VodController.uploadChunk);

// POST /api/vods/recording-end - Finalize recording
router.post("/recording-end", AuthMiddleWare.authenticate, VodController.recordingEnd);

// GET /api/vods/:id - Get specific VOD
router.get("/:id", AuthMiddleWare.authenticate, VodController.getVodById);

// POST /api/vods/:id/view - Increment view count
router.post("/:id/view", AuthMiddleWare.authenticate, VodController.incrementView);

export default router;
