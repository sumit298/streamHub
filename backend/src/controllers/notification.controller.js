const Notification = require("../models/Notification");

const NotificationController = {
  getAllNotifications: async (req, res) => {
    try {
      const { limit = 20, unreadOnly = false } = req.query;
      const query = { userId: req.user._id };
      if (unreadOnly === "true") query.read = false;

      const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));


      const unreadCount = await Notification.countDocuments({
        userId: req.user._id,
        read: false,
      });

      res.json({ notifications, unreadCount });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  },
  markAsRead: async (req, res) => {
    try {
      await Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          userId: req.user._id,
        },
        { read: true },
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark as read" });
    }
  },
  markAllAsRead: async (req, res)=> {
    try {
        await Notification.updateMany({
            userId: req.user._id, read: false
        }, {read: true})

        res.json({success: true})
    } catch (error) {
        res.status(500).json({error: "Failed to mark all as read"})
    }
  }
};

module.exports = NotificationController;
