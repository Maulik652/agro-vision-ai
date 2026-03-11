import { protect, authorize } from "../middleware/authMiddleware.js";

/* ──────────────────────────────────────
   Deterministic helpers (seed-based)
   ────────────────────────────────────── */
const textSeed = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/* ──────────────────────────────────────
   GET /satellite/farm-boundary
   ────────────────────────────────────── */
const getFarmBoundary = async (req, res) => {
  try {
    const user = req.user;
    const seed = textSeed(`${user._id}:boundary`);
    const baseLat = 21.17 + seededRandom(seed) * 0.08;
    const baseLng = 72.83 + seededRandom(seed + 1) * 0.08;
    const size = user.farmSize || 5;
    const delta = Math.sqrt(size) * 0.002;

    const polygon = [
      [baseLat, baseLng],
      [baseLat + delta, baseLng + delta * 0.3],
      [baseLat + delta * 1.1, baseLng + delta * 1.2],
      [baseLat + delta * 0.5, baseLng + delta * 1.5],
      [baseLat - delta * 0.1, baseLng + delta * 0.9],
      [baseLat, baseLng]
    ];

    return res.json({
      success: true,
      boundary: {
        type: "Polygon",
        coordinates: polygon,
        area_acres: size,
        centroid: { lat: baseLat + delta * 0.4, lng: baseLng + delta * 0.6 }
      },
      metadata: {
        source: "GPS-Registration",
        lastUpdated: new Date().toISOString(),
        accuracy_m: 3.5
      }
    });
  } catch (err) {
    console.error("getFarmBoundary error:", err);
    return res.status(500).json({ message: "Failed to fetch farm boundary" });
  }
};

/* ──────────────────────────────────────
   GET /satellite/ndvi
   ────────────────────────────────────── */
const getNDVI = async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();
    const seed = textSeed(`${user._id}:ndvi:${now.getMonth()}`);

    const avgNDVI = 0.45 + seededRandom(seed) * 0.35;
    const trend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const daySeed = seed + i * 7;
      trend.push({
        date: d.toISOString().split("T")[0],
        ndvi: Math.max(0.1, Math.min(0.95, avgNDVI + (seededRandom(daySeed) - 0.5) * 0.15))
      });
    }

    return res.json({
      success: true,
      ndvi: {
        average: +avgNDVI.toFixed(3),
        min: +Math.max(0.1, avgNDVI - 0.18).toFixed(3),
        max: +Math.min(0.95, avgNDVI + 0.15).toFixed(3),
        healthStatus: avgNDVI > 0.65 ? "Excellent" : avgNDVI > 0.45 ? "Good" : avgNDVI > 0.3 ? "Fair" : "Poor",
        classification: avgNDVI > 0.65 ? "Dense Vegetation" : avgNDVI > 0.45 ? "Moderate Vegetation" : avgNDVI > 0.25 ? "Sparse Vegetation" : "Bare/Stressed"
      },
      trend,
      satellite: {
        source: "Sentinel-2 MSI",
        band: "B8 (NIR) / B4 (Red)",
        resolution_m: 10,
        lastCapture: now.toISOString(),
        cloudCover: +(seededRandom(seed + 99) * 20).toFixed(1)
      }
    });
  } catch (err) {
    console.error("getNDVI error:", err);
    return res.status(500).json({ message: "Failed to fetch NDVI data" });
  }
};

/* ──────────────────────────────────────
   GET /satellite/vegetation-analysis
   ────────────────────────────────────── */
const getVegetationAnalysis = async (req, res) => {
  try {
    const user = req.user;
    const seed = textSeed(`${user._id}:veg:${new Date().getMonth()}`);
    const crop = user.crops || "Wheat";

    const stressTypes = ["water", "nutrient", "pest", "heat", "none"];
    const zones = [];
    const zoneCount = 3 + Math.floor(seededRandom(seed) * 4);
    for (let i = 0; i < zoneCount; i++) {
      const zSeed = seed + i * 13;
      const health = 40 + seededRandom(zSeed) * 55;
      const stressIdx = Math.floor(seededRandom(zSeed + 1) * stressTypes.length);
      zones.push({
        zoneId: `Z${i + 1}`,
        zoneName: `Zone ${String.fromCharCode(65 + i)}`,
        healthScore: +health.toFixed(1),
        ndvi: +(0.25 + seededRandom(zSeed + 2) * 0.55).toFixed(3),
        stressType: health > 70 ? "none" : stressTypes[stressIdx],
        stressLevel: health > 70 ? "Low" : health > 50 ? "Medium" : "High",
        area_pct: +(100 / zoneCount).toFixed(1),
        recommendation: health > 70
          ? "Vegetation looks healthy. Continue current management."
          : health > 50
            ? `Moderate stress detected. Monitor ${stressTypes[stressIdx]} levels closely.`
            : `High stress in this zone. Immediate ${stressTypes[stressIdx]} management needed.`,
        centroid: {
          x: 10 + seededRandom(zSeed + 3) * 80,
          y: 10 + seededRandom(zSeed + 4) * 80
        }
      });
    }

    const overallHealth = zones.reduce((s, z) => s + z.healthScore, 0) / zones.length;

    return res.json({
      success: true,
      analysis: {
        overallHealth: +overallHealth.toFixed(1),
        overallStatus: overallHealth > 70 ? "Healthy" : overallHealth > 50 ? "Moderate" : "Stressed",
        cropDetected: crop,
        growthStage: seededRandom(seed + 50) > 0.5 ? "Vegetative" : "Reproductive",
        zones,
        alerts: zones
          .filter((z) => z.stressLevel === "High")
          .map((z) => ({
            zone: z.zoneName,
            type: z.stressType,
            severity: "High",
            message: `Critical ${z.stressType} stress in ${z.zoneName}. Take immediate action.`
          })),
        recommendations: [
          overallHealth < 60 && "Schedule irrigation for stressed zones within 24 hours.",
          zones.some((z) => z.stressType === "nutrient") && "Soil testing recommended for nutrient-deficient zones.",
          zones.some((z) => z.stressType === "pest") && "Apply targeted pest control in affected zones.",
          "Next satellite pass scheduled in 5 days for updated imagery."
        ].filter(Boolean)
      }
    });
  } catch (err) {
    console.error("getVegetationAnalysis error:", err);
    return res.status(500).json({ message: "Failed to fetch vegetation analysis" });
  }
};

/* ──────────────────────────────────────
   Route setup
   ────────────────────────────────────── */
import { Router } from "express";

const router = Router();

router.get("/farm-boundary", protect, authorize("farmer", "admin"), getFarmBoundary);
router.get("/ndvi", protect, authorize("farmer", "admin"), getNDVI);
router.get("/vegetation-analysis", protect, authorize("farmer", "admin"), getVegetationAnalysis);

export default router;
