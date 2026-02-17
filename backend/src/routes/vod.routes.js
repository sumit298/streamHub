const express = require("express");
const VodController = require("../controllers/vod.controller");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const upload = multer({ dest: "/tmp/recordings/" });

const VodRouter = express.Router();

VodRouter.get("/", VodController.getVods);
VodRouter.get("/:id", VodController.getVodById);
VodRouter.post("/:id/view", VodController.incrementView);
VodRouter.post("/upload-chunk", upload.single('chunk'), async (req, res) => {
  try {
    const { streamId } = req.body;
    const chunk = req.file;
    
    if (!chunk || !streamId) {
      return res.status(400).json({ error: 'Missing chunk or streamId' });
    }
    
    const filepath = path.join("/tmp/recordings", `${streamId}.webm`);
    await fs.promises.appendFile(filepath, await fs.promises.readFile(chunk.path));
    await fs.promises.unlink(chunk.path);
    
    res.json({ success: true });
  } catch (error) {
    req.logger?.error('Upload chunk error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = VodRouter;
