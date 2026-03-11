import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import FarmField from "../models/FarmField.js";

const router = Router();

/* ─── GET /fields ─── */
router.get("/", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const fields = await FarmField.find({ farmer: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, fields });
  } catch (err) {
    console.error("Fields fetch error:", err);
    return res.status(500).json({ message: "Failed to fetch fields" });
  }
});

/* ─── POST /fields ─── */
router.post("/", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const { fieldName, cropType, fieldSize, unit, soilType, waterSource, location, sowingDate, season, notes } = req.body;
    if (!fieldName) return res.status(400).json({ message: "fieldName is required" });

    const field = await FarmField.create({
      farmer: req.user._id,
      fieldName: fieldName.slice(0, 100),
      cropType: (cropType || "").slice(0, 60),
      fieldSize: Math.max(0, Number(fieldSize) || 0),
      unit: unit || "acre",
      soilType: soilType || "loamy",
      waterSource: waterSource || "borewell",
      location: {
        city: location?.city || req.user.city,
        state: location?.state || req.user.state,
        lat: location?.lat,
        lng: location?.lng
      },
      sowingDate: sowingDate ? new Date(sowingDate) : undefined,
      season: season || "kharif",
      notes: (notes || "").slice(0, 500),
      status: "active"
    });

    return res.status(201).json({ success: true, field });
  } catch (err) {
    console.error("Field create error:", err);
    return res.status(500).json({ message: "Failed to create field" });
  }
});

/* ─── PATCH /fields/:id ─── */
router.patch("/:id", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const allowed = [
      "fieldName", "cropType", "fieldSize", "unit", "soilType", "waterSource",
      "sowingDate", "expectedHarvestDate", "season", "status", "notes", "soilHealth"
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const field = await FarmField.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user._id },
      { $set: update },
      { new: true }
    );

    if (!field) return res.status(404).json({ message: "Field not found" });
    return res.json({ success: true, field });
  } catch (err) {
    console.error("Field update error:", err);
    return res.status(500).json({ message: "Failed to update field" });
  }
});

/* ─── DELETE /fields/:id ─── */
router.delete("/:id", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const result = await FarmField.deleteOne({ _id: req.params.id, farmer: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Field not found" });
    return res.json({ success: true, message: "Field deleted" });
  } catch (err) {
    console.error("Field delete error:", err);
    return res.status(500).json({ message: "Failed to delete field" });
  }
});

/* ─── GET /fields/summary ─── */
router.get("/summary", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const fields = await FarmField.find({ farmer: req.user._id }).lean();

    const totalArea = fields.reduce((s, f) => s + (f.fieldSize || 0), 0);
    const cropDistribution = {};
    const statusBreakdown = {};

    for (const f of fields) {
      const crop = f.cropType || "Unassigned";
      cropDistribution[crop] = (cropDistribution[crop] || 0) + (f.fieldSize || 0);
      statusBreakdown[f.status] = (statusBreakdown[f.status] || 0) + 1;
    }

    return res.json({
      success: true,
      summary: {
        totalFields: fields.length,
        totalArea,
        cropDistribution,
        statusBreakdown
      }
    });
  } catch (err) {
    console.error("Fields summary error:", err);
    return res.status(500).json({ message: "Failed to fetch summary" });
  }
});

export default router;
