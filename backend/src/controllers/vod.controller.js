const VOD = require("../models/Vod");

const VodController = {
  getVods: async (req, res) => {
    try {
      const { category, userId, limit = 20, skip = 0 } = req.query;
      const query = { status: "ready" };

      if (category) query.category = category;
      if (userId) query.userId = userId;

      const vods = await VOD.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .populate("userId", "username avatar");

      res.json(vods);
    } catch (err) {
      req.logger.error("Get VODs error:", err);
      res.status(500).json({ error: err.message });
    }
  },

  getVodById: async (req, res) => {
    try {
      const vod = await VOD.findById(req.params.id).populate(
        "userId",
        "username avatar",
      );
      if (!vod) return res.status(404).json({ error: "VOD not found" });

      const playbackUrl = await req.r2Service.getSignedUrl(vod.r2Key);

      res.json({ ...vod.toObject(), playbackUrl });
    } catch (error) {
      req.logger?.error("Get VOD by ID error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  incrementView: async (req, res) => {
    try {
      await VOD.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
      res.json({ success: true });
    } catch (error) {
      req.logger?.error("Increment view error:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = VodController;
