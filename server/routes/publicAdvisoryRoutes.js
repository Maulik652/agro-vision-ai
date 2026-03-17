import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import Advisory from "../models/Advisory.js";
import { getOrSetCache } from "../config/redis.js";

const router = Router();

// Accessible to farmers and buyers
router.use(protect, authorize("farmer", "buyer", "expert", "admin"));

/* GET /api/advisories/public — paginated feed of active/published advisories */
router.get("/", async (req, res) => {
  try {
    const { category, crop, page = 1, limit = 12 } = req.query;
    const user = req.user;
    const key = `pub_adv_${user.role}_${category || "all"}_${crop || "all"}_${page}`;

    const data = await getOrSetCache(key, 60, async () => {
      const filter = {
        status: { $in: ["active", "published"] },
        $or: [
          { targetAudience: { $in: ["all"] } },
          { targetAudience: { $in: [user.role === "farmer" ? "farmers" : "buyers"] } }
        ]
      };
      if (category) filter.category = category;
      if (crop)     filter.cropTypes = { $in: [new RegExp(crop, "i")] };

      const [docs, total] = await Promise.all([
        Advisory.find(filter)
          .populate("createdBy", "name qualification experience photo")
          .sort({ priority: -1, publishedAt: -1 })
          .skip((Number(page) - 1) * Number(limit))
          .limit(Number(limit))
          .lean(),
        Advisory.countDocuments(filter)
      ]);

      // Increment views in background
      const ids = docs.map(d => d._id);
      if (ids.length) Advisory.updateMany({ _id: { $in: ids } }, { $inc: { views: 1 } }).catch(() => {});

      return { advisories: docs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
    });

    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* GET /api/advisories/public/:id — single advisory detail */
router.get("/:id", async (req, res) => {
  try {
    const doc = await Advisory.findOne({
      _id: req.params.id,
      status: { $in: ["active", "published"] }
    }).populate("createdBy", "name qualification experience photo city state").lean();

    if (!doc) return res.status(404).json({ success: false, message: "Advisory not found" });

    Advisory.updateOne({ _id: doc._id }, { $inc: { views: 1 } }).catch(() => {});
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
