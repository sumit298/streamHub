const express = require("express");
const VodController = require("../controllers/vod.controller");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { finalizedRecordings } = require("../utils/recordingState");

const upload = multer({ dest: "/tmp/recordings/" });

const VodRouter = express.Router();

VodRouter.get("/", VodController.getVods);
VodRouter.post("/upload-chunk", upload.single('chunk'), async (req, res) => {
  try {
    const { streamId, recordingId } = req.body;
    const chunk = req.file;

    if (!chunk || !streamId || !recordingId) {
      return res.status(400).json({ error: 'Missing chunk, streamId, or recordingId' });
    }

    // Validate recordingId format: streamId-timestamp
    if (!/^[a-f0-9-]{36}-\d+$/i.test(recordingId)) {
      return res.status(400).json({ error: 'Invalid recordingId format' });
    }

    const filepath = path.join("/tmp/recordings", `${recordingId}.webm`);
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
    const { streamId, recordingId } = req.body;

    if (!streamId || !recordingId) {
      return res.status(400).json({ error: 'Missing streamId or recordingId' });
    }

    if (!/^[a-f0-9-]{36}-\d+$/i.test(recordingId)) {
      return res.status(400).json({ error: 'Invalid recordingId format' });
    }

    const filepath = path.join("/tmp/recordings", `${recordingId}.webm`);

    try {
      await fs.promises.access(filepath);
    } catch {
      return res.json({ success: true, message: 'No file found, skipping' });
    }

    const fixWebmDuration = require("fix-webm-duration");
    const buffer = await fs.promises.readFile(filepath);
    const fixedBuffer = await fixWebmDuration(buffer);
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
