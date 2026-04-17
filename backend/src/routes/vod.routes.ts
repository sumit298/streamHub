import express, { Router } from "express";
import multer from "multer";
import VodController from "@controllers/vod.controller";

const RECORDINGS_ROOT = "/tmp/recordings";
const upload = multer({ dest: RECORDINGS_ROOT + "/" });

const router: Router = express.Router();

// GET /api/vods - Get all VODs
router.get("/", VodController.getVods);

// POST /api/vods/upload-chunk - Upload recording chunk
router.post("/upload-chunk", upload.single("chunk"), VodController.uploadChunk);

// POST /api/vods/recording-end - Finalize recording
router.post("/recording-end", VodController.recordingEnd);

// GET /api/vods/:id - Get specific VOD
router.get("/:id", VodController.getVodById);

// POST /api/vods/:id/view - Increment view count
router.post("/:id/view", VodController.incrementView);

export default router;
