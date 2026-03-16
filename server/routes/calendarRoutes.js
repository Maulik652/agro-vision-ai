import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import CropActivity from "../models/CropActivity.js";

const router = express.Router();

router.use(protect, authorize("farmer", "admin"));

/** GET /api/calendar — list activities */
router.get("/", async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = { farmer: req.user._id };

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      filter.dueDate = { $gte: start, $lte: end };
    }

    const activities = await CropActivity.find(filter).sort({ dueDate: 1 });
    return res.json({ success: true, data: activities });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** POST /api/calendar — create activity */
router.post("/", async (req, res) => {
  try {
    const activity = await CropActivity.create({ ...req.body, farmer: req.user._id });
    return res.status(201).json({ success: true, data: activity });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** PUT /api/calendar/:id — update activity */
router.put("/:id", async (req, res) => {
  try {
    const activity = await CropActivity.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!activity) return res.status(404).json({ success: false, message: "Activity not found" });
    return res.json({ success: true, data: activity });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** DELETE /api/calendar/:id — delete activity */
router.delete("/:id", async (req, res) => {
  try {
    const activity = await CropActivity.findOneAndDelete({ _id: req.params.id, farmer: req.user._id });
    if (!activity) return res.status(404).json({ success: false, message: "Activity not found" });
    return res.json({ success: true, message: "Activity deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
