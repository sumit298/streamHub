const express = require("express");
const VodController = require("../controllers/vod.controller");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { finalizedRecordings } = require("../utils/recordingState");
const fixWebmDurationNode = require("../utils/fixWebmDurationNode");

const RECORDINGS_ROOT = "/tmp/recordings";
const RESOLVED_RECORDINGS_ROOT = path.resolve(RECORDINGS_ROOT);
// Allowlist: UUID-timestamp only
const RECORDING_ID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-\d+$/i;

const upload = multer({ dest: RECORDINGS_ROOT + "/" });

const VodRouter = express.Router();

VodRouter.get("/", VodController.getVods);
VodRouter.post("/upload-chunk", upload.single('chunk'), async (req, res) => {
  try {
    const { streamId, recordingId } = req.body;
    const chunk = req.file;

    if (!chunk || !streamId || !recordingId) {
      return res.status(400).json({ error: 'Missing chunk, streamId, or recordingId' });
    }

    if (!RECORDING_ID_RE.test(recordingId)) {
      return res.status(400).json({ error: 'Invalid recordingId format' });
    }

    const filepath = path.resolve(RECORDINGS_ROOT, `${recordingId}.webm`);
    if (!filepath.startsWith(RESOLVED_RECORDINGS_ROOT + path.sep)) {
      return res.status(400).json({ error: 'Invalid recording path' });
    }

    await fs.promises.appendFile(filepath, await fs.promises.readFile(chunk.path));
    await fs.promises.unlink(chunk.path);

    res.json({ success: true });
  } catch (error) {
    req.logger?.error('Upload chunk error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

VodRouter.post("/recording-end", async (req, res) => {
  try {
    const { streamId, recordingId, durationMs } = req.body;

    if (!streamId || !recordingId) {
      return res.status(400).json({ error: 'Missing streamId or recordingId' });
    }

    if (!RECORDING_ID_RE.test(recordingId)) {
      return res.status(400).json({ error: 'Invalid recordingId format' });
    }

    const filepath = path.resolve(RECORDINGS_ROOT, `${recordingId}.webm`);
    if (!filepath.startsWith(RESOLVED_RECORDINGS_ROOT + path.sep)) {
      return res.status(400).json({ error: 'Invalid recording path' });
    }

    try {
      await fs.promises.access(filepath);
    } catch {
      return res.json({ success: true, message: 'No file found, skipping' });
    }

    const buffer = await fs.promises.readFile(filepath);
    const fixedBuffer = await fixWebmDurationNode(buffer, durationMs || 0);
    await fs.promises.writeFile(filepath, fixedBuffer);

    finalizedRecordings.add(recordingId);
    req.logger?.info(`Recording finalized: ${recordingId}`);
    res.json({ success: true });
  } catch (error) {
    req.logger?.error('Recording end error:', error);
    res.status(500).json({ error: 'Failed to finalize recording' });
  }
});

VodRouter.get("/:id", VodController.getVodById);
VodRouter.post("/:id/view", VodController.incrementView);

module.exports = VodRouter;
