import {
  buildSellAssistant,
  detectCropQuality,
  estimateLogistics,
  predictDemand,
  suggestPrice
} from "../services/marketAIService.js";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const aiPriceSuggestion = async (req, res) => {
  try {
    const crop = String(req.body.crop || req.body.cropName || "").trim();
    const quantity = toNumber(req.body.quantity, NaN);
    const location = String(req.body.location || "").trim();

    if (!crop) {
      return res.status(400).json({ success: false, message: "crop is required" });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: "quantity must be greater than 0" });
    }

    if (!location) {
      return res.status(400).json({ success: false, message: "location is required" });
    }

    const result = await suggestPrice({
      crop,
      quantity,
      location,
      demand: req.body.demand,
      last_7_day_price: req.body.last_7_day_price || req.body.last7DayPrice
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to generate AI price suggestion",
      detail: error.message
    });
  }
};

export const aiDemandPrediction = async (req, res) => {
  try {
    const crop = String(req.body.crop || req.body.cropName || "").trim();
    const location = String(req.body.location || "").trim();

    if (!crop) {
      return res.status(400).json({ success: false, message: "crop is required" });
    }

    if (!location) {
      return res.status(400).json({ success: false, message: "location is required" });
    }

    const result = await predictDemand({
      crop,
      location,
      last_7_day_price: req.body.last_7_day_price || req.body.last7DayPrice
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to generate AI demand prediction",
      detail: error.message
    });
  }
};

export const aiQualityCheck = async (req, res) => {
  try {
    const crop = String(req.body.crop || req.body.cropName || "").trim() || "crop";

    const result = await detectCropQuality({
      crop,
      imageBase64: String(req.body.imageBase64 || "").trim(),
      quantity: req.body.quantity,
      location: req.body.location
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to run AI quality detection",
      detail: error.message
    });
  }
};

export const aiLogisticsEstimate = async (req, res) => {
  try {
    const pickup = String(req.body.pickup || req.body.pickupLocation || "").trim();
    const drop = String(req.body.drop || req.body.dropLocation || req.body.location || "").trim();

    if (!pickup) {
      return res.status(400).json({ success: false, message: "pickup is required" });
    }

    if (!drop) {
      return res.status(400).json({ success: false, message: "drop is required" });
    }

    const result = await estimateLogistics({
      pickup,
      drop,
      distance_km: req.body.distance_km ?? req.body.distanceKm,
      vehicleType: req.body.vehicleType
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to estimate logistics cost",
      detail: error.message
    });
  }
};

export const aiSellAssistant = async (req, res) => {
  try {
    const crop = String(req.body.crop || req.body.cropName || "").trim();
    const quantity = toNumber(req.body.quantity, NaN);
    const location = String(req.body.location || "").trim();

    if (!crop) {
      return res.status(400).json({ success: false, message: "crop is required" });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: "quantity must be greater than 0" });
    }

    if (!location) {
      return res.status(400).json({ success: false, message: "location is required" });
    }

    const result = await buildSellAssistant({
      crop,
      quantity,
      location,
      demand: req.body.demand,
      last_7_day_price: req.body.last_7_day_price || req.body.last7DayPrice,
      qualityType: req.body.qualityType,
      shelfLifeDays: req.body.shelfLifeDays,
      moisturePercent: req.body.moisturePercent,
      grade: req.body.grade,
      packagingType: req.body.packagingType
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to generate sell assistant insights",
      detail: error.message
    });
  }
};
