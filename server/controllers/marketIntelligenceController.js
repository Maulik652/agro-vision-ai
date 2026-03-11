import {
  getMarketPricesForCrop,
  getCropPriceTrends,
  getAIPricePrediction,
  getMarketInsights,
  getCropProfitability,
  getNearbyMarketComparison,
  getDemandHeatmap
} from "../services/marketIntelligenceService.js";

const sanitizeCrop = (value) => {
  const crop = String(value || "").trim();
  if (!crop || crop.length > 100) return "";
  return crop.replace(/[^a-zA-Z\s]/g, "");
};

export const marketIntelPrices = async (req, res) => {
  try {
    const crop = sanitizeCrop(req.query.crop);
    if (!crop) {
      return res.status(400).json({ success: false, message: "crop query parameter is required" });
    }

    const prices = await getMarketPricesForCrop(crop);
    return res.status(200).json({ success: true, prices });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch market prices", detail: error.message });
  }
};

export const marketIntelTrends = async (req, res) => {
  try {
    const crop = sanitizeCrop(req.query.crop);
    if (!crop) {
      return res.status(400).json({ success: false, message: "crop query parameter is required" });
    }

    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const trends = await getCropPriceTrends(crop, days);
    return res.status(200).json({ success: true, trends });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch price trends", detail: error.message });
  }
};

export const marketIntelPredict = async (req, res) => {
  try {
    const crop = sanitizeCrop(req.query.crop);
    if (!crop) {
      return res.status(400).json({ success: false, message: "crop query parameter is required" });
    }

    const prediction = await getAIPricePrediction(crop);
    return res.status(200).json({ success: true, ...prediction });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to generate price prediction", detail: error.message });
  }
};

export const marketIntelInsights = async (req, res) => {
  try {
    const crop = sanitizeCrop(req.query.crop);
    if (!crop) {
      return res.status(400).json({ success: false, message: "crop query parameter is required" });
    }

    const insights = getMarketInsights(crop);
    return res.status(200).json({ success: true, ...insights });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch market insights", detail: error.message });
  }
};

export const marketIntelProfitability = async (req, res) => {
  try {
    const crop = sanitizeCrop(req.query.crop);
    if (!crop) {
      return res.status(400).json({ success: false, message: "crop query parameter is required" });
    }

    const profitability = await getCropProfitability(crop);
    return res.status(200).json({ success: true, ...profitability });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to calculate profitability", detail: error.message });
  }
};

export const marketIntelNearbyMarkets = async (req, res) => {
  try {
    const crop = sanitizeCrop(req.query.crop);
    if (!crop) {
      return res.status(400).json({ success: false, message: "crop query parameter is required" });
    }

    const baseMarket = String(req.query.market || "Ahmedabad").trim();
    const markets = getNearbyMarketComparison(crop, baseMarket);
    return res.status(200).json({ success: true, markets });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch nearby markets", detail: error.message });
  }
};

export const marketIntelDemandHeatmap = async (req, res) => {
  try {
    const crop = sanitizeCrop(req.query.crop);
    if (!crop) {
      return res.status(400).json({ success: false, message: "crop query parameter is required" });
    }

    const heatmap = getDemandHeatmap(crop);
    return res.status(200).json({ success: true, heatmap });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to generate demand heatmap", detail: error.message });
  }
};
