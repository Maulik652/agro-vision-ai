import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import CropActivity from "../models/CropActivity.js";

const router = Router();

/* ─── Auto-generate activities for a crop ─── */
const CROP_TEMPLATES = {
  tomato: [
    { day: 0, type: "sowing", title: "Sow tomato seeds / transplant seedlings", priority: "high" },
    { day: 5, type: "irrigation", title: "First irrigation after sowing", priority: "high" },
    { day: 15, type: "fertilizer", title: "Apply NPK 20:20:20 basal dose", priority: "high" },
    { day: 20, type: "weeding", title: "First weeding and hoeing", priority: "medium" },
    { day: 25, type: "fertilizer", title: "Top dress with Urea 25kg/acre", priority: "medium" },
    { day: 30, type: "pesticide", title: "Preventive neem oil spray for whitefly", priority: "medium" },
    { day: 35, type: "pruning", title: "Remove side shoots, install staking", priority: "medium" },
    { day: 45, type: "fertilizer", title: "Flowering boost — 0:52:34 foliar spray", priority: "high" },
    { day: 50, type: "pesticide", title: "Monitor & spray for fruit borer if needed", priority: "high" },
    { day: 60, type: "irrigation", title: "Increase irrigation frequency — fruiting stage", priority: "high" },
    { day: 70, type: "fertilizer", title: "Fruiting boost — 13:0:45 foliar spray", priority: "medium" },
    { day: 80, type: "observation", title: "Check for blossom end rot — calcium spray if needed", priority: "medium" },
    { day: 100, type: "observation", title: "Monitor fruit ripening — prepare for harvest", priority: "medium" },
    { day: 110, type: "harvesting", title: "Begin harvesting first flush", priority: "high" }
  ],
  wheat: [
    { day: 0, type: "sowing", title: "Sow wheat — seed rate 40kg/acre", priority: "high" },
    { day: 5, type: "irrigation", title: "Pre-sow irrigation if soil is dry", priority: "high" },
    { day: 21, type: "irrigation", title: "CRI stage irrigation (critical)", priority: "critical" },
    { day: 21, type: "fertilizer", title: "1st top dress — Urea 40kg/acre at CRI", priority: "high" },
    { day: 40, type: "irrigation", title: "2nd irrigation — tillering stage", priority: "high" },
    { day: 45, type: "weeding", title: "Weed control if not done", priority: "medium" },
    { day: 50, type: "fertilizer", title: "2nd top dress — Urea 30kg/acre", priority: "medium" },
    { day: 60, type: "irrigation", title: "3rd irrigation — jointing stage", priority: "high" },
    { day: 75, type: "irrigation", title: "4th irrigation — flowering stage", priority: "high" },
    { day: 80, type: "pesticide", title: "Monitor for yellow rust — spray Propiconazole if seen", priority: "high" },
    { day: 95, type: "irrigation", title: "5th irrigation — grain filling", priority: "medium" },
    { day: 120, type: "observation", title: "Check grain hardness — plan harvest timing", priority: "medium" },
    { day: 130, type: "harvesting", title: "Harvest wheat — grain moisture <14%", priority: "high" }
  ],
  rice: [
    { day: 0, type: "sowing", title: "Prepare nursery bed — seed treatment", priority: "high" },
    { day: 20, type: "transplanting", title: "Transplant 25-day seedlings", priority: "critical" },
    { day: 25, type: "fertilizer", title: "Apply DAP + MOP basal dose", priority: "high" },
    { day: 35, type: "weeding", title: "First weeding — manual or herbicide", priority: "medium" },
    { day: 40, type: "fertilizer", title: "1st top dress — Urea 35kg/acre", priority: "high" },
    { day: 55, type: "pesticide", title: "Check for stem borer / leaf folder", priority: "medium" },
    { day: 60, type: "fertilizer", title: "2nd top dress — Urea 35kg/acre", priority: "high" },
    { day: 70, type: "fertilizer", title: "Apply MOP 25kg/acre — panicle initiation", priority: "medium" },
    { day: 85, type: "pesticide", title: "Monitor for blast disease — spray if symptoms appear", priority: "high" },
    { day: 100, type: "observation", title: "Check grain filling — bird scaring", priority: "medium" },
    { day: 125, type: "irrigation", title: "Drain field — 15 days before harvest", priority: "high" },
    { day: 140, type: "harvesting", title: "Harvest rice — 80% grains golden", priority: "high" }
  ]
};

const DEFAULT_TEMPLATE = [
  { day: 0, type: "sowing", title: "Sow crop", priority: "high" },
  { day: 7, type: "irrigation", title: "First irrigation", priority: "high" },
  { day: 20, type: "fertilizer", title: "Apply basal fertilizer", priority: "medium" },
  { day: 30, type: "weeding", title: "First weeding", priority: "medium" },
  { day: 45, type: "pesticide", title: "Preventive pest spray", priority: "medium" },
  { day: 60, type: "fertilizer", title: "Top dress fertilizer", priority: "medium" },
  { day: 90, type: "observation", title: "Check crop maturity", priority: "medium" },
  { day: 110, type: "harvesting", title: "Harvest crop", priority: "high" }
];

/* ─── POST /calendar/generate ─── */
router.post("/generate", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const { cropType, sowingDate, fieldId } = req.body;
    if (!cropType || !sowingDate) {
      return res.status(400).json({ message: "cropType and sowingDate are required" });
    }

    const sowing = new Date(sowingDate);
    if (isNaN(sowing.getTime())) {
      return res.status(400).json({ message: "Invalid sowingDate" });
    }

    const key = cropType.toLowerCase().trim();
    const template = CROP_TEMPLATES[key] || DEFAULT_TEMPLATE;
    const activities = template.map((t) => ({
      farmer: req.user._id,
      field: fieldId || undefined,
      cropType,
      activityType: t.type,
      title: t.title,
      scheduledDate: new Date(sowing.getTime() + t.day * 86400000),
      priority: t.priority,
      status: "upcoming",
      isAutoGenerated: true
    }));

    const saved = await CropActivity.insertMany(activities);
    return res.status(201).json({ success: true, count: saved.length, activities: saved });
  } catch (err) {
    console.error("Calendar generate error:", err);
    return res.status(500).json({ message: "Failed to generate calendar" });
  }
});

/* ─── GET /calendar ─── */
router.get("/", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const { month, year, cropType, status } = req.query;
    const filter = { farmer: req.user._id };

    if (cropType) filter.cropType = new RegExp(`^${cropType}$`, "i");
    if (status) filter.status = status;

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      filter.scheduledDate = { $gte: start, $lte: end };
    }

    const activities = await CropActivity.find(filter)
      .sort({ scheduledDate: 1 })
      .limit(200)
      .lean();

    return res.json({ success: true, activities });
  } catch (err) {
    console.error("Calendar fetch error:", err);
    return res.status(500).json({ message: "Failed to fetch activities" });
  }
});

/* ─── POST /calendar (manual add) ─── */
router.post("/", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const { cropType, activityType, title, scheduledDate, priority, description, cost, fieldId } = req.body;
    if (!title || !scheduledDate || !activityType) {
      return res.status(400).json({ message: "title, activityType, and scheduledDate are required" });
    }

    const activity = await CropActivity.create({
      farmer: req.user._id,
      field: fieldId || undefined,
      cropType: cropType || "General",
      activityType,
      title: title.slice(0, 200),
      description: (description || "").slice(0, 1000),
      scheduledDate: new Date(scheduledDate),
      priority: priority || "medium",
      cost: Math.max(0, Number(cost) || 0),
      status: "upcoming",
      isAutoGenerated: false
    });

    return res.status(201).json({ success: true, activity });
  } catch (err) {
    console.error("Calendar add error:", err);
    return res.status(500).json({ message: "Failed to add activity" });
  }
});

/* ─── PATCH /calendar/:id ─── */
router.patch("/:id", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const { status, completedDate, cost, description } = req.body;
    const update = {};
    if (status) update.status = status;
    if (completedDate) update.completedDate = new Date(completedDate);
    if (cost !== undefined) update.cost = Math.max(0, Number(cost) || 0);
    if (description !== undefined) update.description = (description || "").slice(0, 1000);

    const activity = await CropActivity.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user._id },
      { $set: update },
      { new: true }
    );

    if (!activity) return res.status(404).json({ message: "Activity not found" });
    return res.json({ success: true, activity });
  } catch (err) {
    console.error("Calendar update error:", err);
    return res.status(500).json({ message: "Failed to update activity" });
  }
});

/* ─── DELETE /calendar/:id ─── */
router.delete("/:id", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const result = await CropActivity.deleteOne({ _id: req.params.id, farmer: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Activity not found" });
    return res.json({ success: true, message: "Activity deleted" });
  } catch (err) {
    console.error("Calendar delete error:", err);
    return res.status(500).json({ message: "Failed to delete activity" });
  }
});

/* ─── GET /calendar/upcoming ─── */
router.get("/upcoming", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 86400000);

    const activities = await CropActivity.find({
      farmer: req.user._id,
      scheduledDate: { $gte: now, $lte: weekLater },
      status: { $in: ["upcoming", "in-progress"] }
    })
      .sort({ scheduledDate: 1 })
      .limit(20)
      .lean();

    return res.json({ success: true, activities });
  } catch (err) {
    console.error("Calendar upcoming error:", err);
    return res.status(500).json({ message: "Failed to fetch upcoming" });
  }
});

export default router;
