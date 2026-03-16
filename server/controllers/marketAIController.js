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

export const aiPriceNegotiation = async (req, res) => {
  try {
    const crop = String(req.body.crop || req.body.cropName || "").trim();
    const farmerPrice = toNumber(req.body.farmerPrice, NaN);
    const buyerOffer = toNumber(req.body.buyerOffer, NaN);
    const location = String(req.body.location || "").trim();

    if (!crop) return res.status(400).json({ success: false, message: "crop is required" });
    if (!Number.isFinite(farmerPrice) || farmerPrice <= 0)
      return res.status(400).json({ success: false, message: "farmerPrice must be > 0" });
    if (!Number.isFinite(buyerOffer) || buyerOffer <= 0)
      return res.status(400).json({ success: false, message: "buyerOffer must be > 0" });

    // Simple negotiation logic: recommend midpoint weighted toward market
    const midpoint = (farmerPrice + buyerOffer) / 2;
    const spread = farmerPrice - buyerOffer;
    const spreadRatio = spread / farmerPrice;

    // Acceptance probability: higher when offer is close to farmer price
    const rawProb = Math.max(0.05, Math.min(0.97, 1 - spreadRatio * 1.4));
    const recommended_price = Math.round((midpoint + farmerPrice * 0.35 + buyerOffer * 0.15) / 2 * 100) / 100;
    const acceptance_probability = Math.round(rawProb * 100) / 100;

    return res.status(200).json({
      success: true,
      data: {
        recommended_price,
        acceptance_probability,
        farmer_price: farmerPrice,
        buyer_offer: buyerOffer,
        spread: Math.round(spread * 100) / 100,
        insight: spreadRatio < 0.1
          ? "Very close to agreement — farmer likely to accept."
          : spreadRatio < 0.2
          ? "Reasonable gap — a small concession from both sides should close the deal."
          : "Large gap — consider meeting closer to the market price.",
        model: "Negotiation Engine v1"
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to generate negotiation suggestion",
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
