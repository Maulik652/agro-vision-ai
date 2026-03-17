import {
  fetchOverview,
  fetchMarketTrends,
  fetchDemandSupply,
  fetchCropPerformance,
  fetchRegionAnalysis,
  fetchAIPerformance,
  fetchUserAnalytics,
  generateAIInsights
} from "../services/reportsService.js";

const ok = (res, data) => res.json({ success: true, data });
const err = (res, e, msg = "Server error") => {
  console.error(msg, e);
  res.status(500).json({ success: false, message: msg });
};

const getFilters = (q) => ({
  from:   q.from   || null,
  to:     q.to     || null,
  crop:   q.crop   || null,
  region: q.region || null
});

export const getOverview        = async (req, res) => { try { ok(res, await fetchOverview()); } catch (e) { err(res, e, "Overview failed"); } };
export const getMarketTrends    = async (req, res) => { try { ok(res, await fetchMarketTrends(getFilters(req.query))); } catch (e) { err(res, e, "Market trends failed"); } };
export const getDemandSupply    = async (req, res) => { try { ok(res, await fetchDemandSupply(getFilters(req.query))); } catch (e) { err(res, e, "Demand supply failed"); } };
export const getCropPerformance = async (req, res) => { try { ok(res, await fetchCropPerformance(getFilters(req.query))); } catch (e) { err(res, e, "Crop performance failed"); } };
export const getRegionAnalysis  = async (req, res) => { try { ok(res, await fetchRegionAnalysis(getFilters(req.query))); } catch (e) { err(res, e, "Region analysis failed"); } };
export const getAIPerformance   = async (req, res) => { try { ok(res, await fetchAIPerformance()); } catch (e) { err(res, e, "AI performance failed"); } };
export const getUserAnalytics   = async (req, res) => { try { ok(res, await fetchUserAnalytics(getFilters(req.query))); } catch (e) { err(res, e, "User analytics failed"); } };

export const getAIInsights = async (req, res) => {
  try {
    const [overview, demandSupply, cropPerformance, regionAnalysis] = await Promise.all([
      fetchOverview(),
      fetchDemandSupply({}),
      fetchCropPerformance({}),
      fetchRegionAnalysis({})
    ]);
    const insights = await generateAIInsights({ overview, demandSupply, cropPerformance, regionAnalysis });
    ok(res, { insights });
  } catch (e) {
    err(res, e, "AI insights failed");
  }
};

export const generateReport = async (req, res) => {
  try {
    const filters = req.body?.filters || {};
    const format  = req.body?.format  || "json";
    const [overview, marketTrends, demandSupply, cropPerformance, regionAnalysis, aiPerformance, userAnalytics] = await Promise.all([
      fetchOverview(),
      fetchMarketTrends(filters),
      fetchDemandSupply(filters),
      fetchCropPerformance(filters),
      fetchRegionAnalysis(filters),
      fetchAIPerformance(),
      fetchUserAnalytics(filters)
    ]);
    const reportData = { generatedAt: new Date(), filters, overview, marketTrends, demandSupply, cropPerformance, regionAnalysis, aiPerformance, userAnalytics };
    // PDF/Excel generation would use pdfkit/exceljs here — returning JSON for now
    ok(res, { format, report: reportData, message: `Report generated successfully in ${format} format` });
  } catch (e) {
    err(res, e, "Report generation failed");
  }
};
