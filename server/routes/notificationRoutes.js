import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import Notification from "../models/Notification.js";

const router = Router();

/* ─── GET /notifications ─── */
router.get("/", protect, async (req, res) => {
  try {
    const { read, limit = 30, page = 1 } = req.query;
    const filter = { user: req.user._id };
    if (read !== undefined) filter.read = read === "true";

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, read: false })
    ]);

    return res.json({ success: true, notifications, total, unreadCount });
  } catch (err) {
    console.error("Notification fetch error:", err);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

/* ─── PATCH /notifications/:id/read ─── */
router.patch("/:id/read", protect, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true } },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: "Notification not found" });
    return res.json({ success: true, notification: notif });
  } catch (err) {
    console.error("Notification read error:", err);
    return res.status(500).json({ message: "Failed to update notification" });
  }
});

/* ─── PATCH /notifications/read-all ─── */
router.patch("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );
    return res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("Notification read-all error:", err);
    return res.status(500).json({ message: "Failed to mark all as read" });
  }
});

/* ─── DELETE /notifications/:id ─── */
router.delete("/:id", protect, async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
    return res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("Notification delete error:", err);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
});

export default router;
