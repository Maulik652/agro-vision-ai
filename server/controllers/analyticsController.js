/**
 * Analytics Controller — AgroVision AI
 */
import { analyticsQuerySchema } from "../validation/analyticsValidation.js";
import {
  getBuyerAnalyticsData,
  generateAIInsights,
  generateAIPredictions,
} from "../services/analyticsService.js";
import { getOrSetCache } from "../config/redis.js";

/** GET /api/analytics/buyer */
export const getBuyerAnalytics = async (req, res) => {
  try {
    const parsed = analyticsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({ message: "Invalid query params", errors: parsed.error.flatten() });
    }

    const buyerId  = req.user._id.toString();
    const { range, cropType } = parsed.data;
    const cacheKey = `analytics_buyer_${buyerId}_${range}_${cropType ?? "all"}`;

    const data = await getOrSetCache(cacheKey, 300, () =>
      getBuyerAnalyticsData(buyerId, { range, cropType })
    );

    return res.json(data);
  } catch (err) {
    console.error("getBuyerAnalytics error:", err);
    return res.status(500).json({ message: "Failed to fetch analytics" });
  }
};

/** GET /api/analytics/ai-insights */
export const getAIInsights = async (req, res) => {
  try {
    const buyerId  = req.user._id.toString();
    const cacheKey = `analytics_insights_${buyerId}`;

    const data = await getOrSetCache(cacheKey, 300, () =>
      generateAIInsights(buyerId)
    );

    return res.json(data);
  } catch (err) {
    console.error("getAIInsights error:", err);
    return res.status(500).json({ message: "Failed to fetch AI insights" });
  }
};

/** GET /api/analytics/ai-predictions */
export const getAIPredictions = async (req, res) => {
  try {
    const buyerId  = req.user._id.toString();
    const cacheKey = `analytics_predictions_${buyerId}`;

    const data = await getOrSetCache(cacheKey, 300, () =>
      generateAIPredictions(buyerId)
    );

    return res.json(data);
  } catch (err) {
    console.error("getAIPredictions error:", err);
    return res.status(500).json({ message: "Failed to fetch AI predictions" });
  }
};
