import * as service from "../services/expertDashboardService.js";

const ok = (res, data) => res.json({ success: true, data });
const fail = (res, err) => res.status(500).json({ success: false, message: err.message });

export const getOverview = async (req, res) => {
  try { ok(res, await service.fetchOverview()); } catch (e) { fail(res, e); }
};

export const getMarketTrends = async (req, res) => {
  try {
    const { crop = "Wheat", days = 30 } = req.query;
    ok(res, await service.fetchMarketTrends(String(crop), Number(days)));
  } catch (e) { fail(res, e); }
};

export const getAIPredictions = async (req, res) => {
  try {
    const { crop = "Wheat" } = req.query;
    ok(res, await service.fetchAIPredictions(String(crop)));
  } catch (e) { fail(res, e); }
};

export const getDiseaseReports = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    ok(res, await service.fetchDiseaseReports(limit));
  } catch (e) { fail(res, e); }
};

export const getFarmerActivity = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    ok(res, await service.fetchFarmerActivity(limit));
  } catch (e) { fail(res, e); }
};

export const getCropDemand = async (req, res) => {
  try { ok(res, await service.fetchCropDemand()); } catch (e) { fail(res, e); }
};

export const getQualityReports = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    ok(res, await service.fetchQualityReports(limit));
  } catch (e) { fail(res, e); }
};

export const postRecommendation = async (req, res) => {
  try {
    const { title, body, cropName, region, tags, priority } = req.body;
    if (!title || !body) return res.status(400).json({ success: false, message: "title and body are required" });
    const rec = await service.createRecommendation(req.user._id, { title, body, cropName, region, tags, priority });
    res.status(201).json({ success: true, data: rec });
  } catch (e) { fail(res, e); }
};

export const getPlatformAnalytics = async (req, res) => {
  try { ok(res, await service.fetchPlatformAnalytics()); } catch (e) { fail(res, e); }
};
