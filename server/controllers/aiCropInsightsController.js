import axios from "axios";
import mongoose from "mongoose";
import CropListing from "../models/CropListing.js";
import MarketplaceCrop from "../models/MarketplaceCrop.js";
import CropPriceHistory from "../models/CropPriceHistory.js";
import { getCache, setCache } from "../config/redis.js";

const AI_INSIGHTS_TTL_SECONDS = 300;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const textSeed = (value = "") => {
  let hash = 0;
  const text = String(value || "");

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) % 1_000_003;
  }

  return hash;
};

const fallbackInsights = ({ cropId, cropName, currentPrice }) => {
  const seed = textSeed(`${cropId}:${cropName}`);
  const basePrice = Math.max(5, toNumber(currentPrice, 25));

  const demandScore = Number((0.56 + ((seed % 31) / 100)).toFixed(2));
  const volatilityIndex = Number((0.12 + ((seed % 21) / 100)).toFixed(2));
  const confidenceScore = Number((0.68 + ((seed % 27) / 100)).toFixed(2));
  const predictedPrice = Number((basePrice * (1.03 + ((seed % 10) / 100))).toFixed(2));

  return {
    current_price: Number(basePrice.toFixed(2)),
    predicted_price: predictedPrice,
    demand_score: demandScore,
    volatility_index: volatilityIndex,
    confidence_score: confidenceScore
  };
};

const findCrop = async (cropId) => {
  if (!mongoose.Types.ObjectId.isValid(cropId)) {
    return null;
  }

  const objectId = new mongoose.Types.ObjectId(cropId);

  const listing = await CropListing.findOne({
    _id: objectId,
    isActive: true,
    status: "active"
  }).lean();

  if (listing) {
    return {
      cropName: listing.cropName,
      currentPrice: toNumber(listing.price, 0),
      location: listing.location?.city || listing.location?.state || "market"
    };
  }

  const marketplaceCrop = await MarketplaceCrop.findById(objectId).lean();
  if (!marketplaceCrop) {
    return null;
  }

  return {
    cropName: marketplaceCrop.cropName,
    currentPrice: toNumber(marketplaceCrop.pricePerKg, 0),
    location: marketplaceCrop.location?.city || marketplaceCrop.location?.state || "market"
  };
};

export const getAICropInsightsByCropId = async (req, res) => {
  try {
    const cropId = req.validatedParams?.cropId || req.params.cropId;
    const cacheKey = `ai_crop_insights_${cropId}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const crop = await findCrop(cropId);

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found"
      });
    }

    const historyRows = await CropPriceHistory.find({
      cropName: { $regex: `^${String(crop.cropName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
    })
      .sort({ date: -1 })
      .limit(7)
      .lean();

    const priceHistory = historyRows.map((row) => toNumber(row.price, 0)).filter((value) => value > 0);

    const aiServiceBaseUrl = String(
      process.env.CROP_AI_SERVICE_URL || process.env.PYTHON_AI_URL || "http://ai-service:8000"
    ).replace(/\/$/, "");

    let insights;
    let source = "ai-service";

    try {
      const { data } = await axios.get(`${aiServiceBaseUrl}/ai/crop-insight/${cropId}`, {
        params: {
          crop: crop.cropName,
          location: crop.location,
          current_price: crop.currentPrice,
          price_history: priceHistory.join(",")
        },
        timeout: 6_000
      });

      insights = {
        current_price: toNumber(data?.current_price, crop.currentPrice),
        predicted_price: toNumber(data?.predicted_price, crop.currentPrice),
        demand_score: toNumber(data?.demand_score, 0.7),
        volatility_index: toNumber(data?.volatility_index, 0.2),
        confidence_score: toNumber(data?.confidence_score, 0.8)
      };
    } catch {
      source = "fallback";
      insights = fallbackInsights({
        cropId,
        cropName: crop.cropName,
        currentPrice: crop.currentPrice
      });
    }

    const response = {
      success: true,
      cropId,
      cropName: crop.cropName,
      insights,
      source
    };

    await setCache(cacheKey, response, AI_INSIGHTS_TTL_SECONDS);

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch AI crop insights",
      detail: error.message
    });
  }
};
