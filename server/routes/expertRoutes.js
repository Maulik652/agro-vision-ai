import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  getOverview,
  getMarketTrends,
  getAIPredictions,
  getDiseaseReports,
  getFarmerActivity,
  getCropDemand,
  getQualityReports,
  postRecommendation,
  getPlatformAnalytics
} from "../controllers/expertDashboardController.js";
import {
  getOverview          as getConsultationOverview,
  getConsultations,
  getConsultationById,
  acceptConsultation,
  rejectConsultation,
  scheduleConsultation,
  completeConsultation,
  postRecommendation   as postConsultationRecommendation,
  getMessages,
  postMessage,
  getHistory
} from "../controllers/consultationController.js";
import {
  getActiveConsultations,
  getDetail,
  startConsultation,
  completeConsultation  as completeActive,
  escalateConsultation,
  getMessages           as getActiveMessages,
  postMessage           as postActiveMessage,
  markRead,
  postRecommendation    as postActiveRecommendation,
  getTimeline,
  triggerAIAnalysis,
  getAIAssistant
} from "../controllers/activeConsultationController.js";
import {
  getOverview        as getReportsOverview,
  getMarketTrends    as getReportsMarketTrends,
  getDemandSupply    as getReportsDemandSupply,
  getCropPerformance as getReportsCropPerformance,
  getRegionAnalysis  as getReportsRegionAnalysis,
  getAIPerformance   as getReportsAIPerformance,
  getUserAnalytics   as getReportsUserAnalytics,
  getAIInsights      as getReportsAIInsights,
  generateReport     as generateReportExport
} from "../controllers/reportsController.js";
import {
  getOverview       as getEarningsOverview,
  getTrends         as getEarningsTrends,
  getTransactions   as getEarningsTransactions,
  getCommission     as getEarningsCommission,
  getPayouts        as getEarningsPayouts,
  getPaymentStatus  as getEarningsPaymentStatus,
  getForecast       as getEarningsForecast,
  releasePayout     as releaseEarningsPayout,
  exportReport      as exportEarningsReport
} from "../controllers/earningsController.js";
import {
  getOverview       as getAdvisoryOverview,
  getFeed,
  getById           as getAdvisoryById,
  createAdvisory,
  updateAdvisory,
  deleteAdvisory,
  publishAdvisory,
  changeStatus,
  broadcastAlert,
  getAnalytics      as getAdvisoryAnalytics,
  getHistory        as getAdvisoryHistory,
  getMarketInsights,
  aiGenerate
} from "../controllers/advisoryController.js";

const router = Router();

router.use(protect, authorize("expert", "admin"));

/* ── Dashboard analytics ── */
router.get("/overview",           getOverview);
router.get("/market-trends",      getMarketTrends);
router.get("/ai-predictions",     getAIPredictions);
router.get("/disease-reports",    getDiseaseReports);
router.get("/farmer-activity",    getFarmerActivity);
router.get("/crop-demand",        getCropDemand);
router.get("/quality-reports",    getQualityReports);
router.post("/recommendation",    postRecommendation);
router.get("/platform-analytics", getPlatformAnalytics);

/* ── Consultation lifecycle ── */
router.get("/consultations/overview",          getConsultationOverview);
router.get("/consultations/history",           getHistory);
router.get("/consultations/active",            getActiveConsultations);
router.get("/consultations",                   getConsultations);
router.get("/consultations/:id",               getConsultationById);
router.patch("/consultations/:id/accept",      acceptConsultation);
router.patch("/consultations/:id/reject",      rejectConsultation);
router.post("/consultations/:id/schedule",     scheduleConsultation);
router.patch("/consultations/:id/complete",    completeConsultation);
router.post("/consultations/:id/recommendation", postConsultationRecommendation);
router.get("/consultations/:id/messages",      getMessages);
router.post("/consultations/:id/messages",     postMessage);

/* ── Active consultation workspace ── */
router.get("/active/:id",                      getDetail);
router.patch("/active/:id/start",              startConsultation);
router.patch("/active/:id/complete",           completeActive);
router.patch("/active/:id/escalate",           escalateConsultation);
router.get("/active/:id/messages",             getActiveMessages);
router.post("/active/:id/messages",            postActiveMessage);
router.patch("/active/:id/messages/read",      markRead);
router.post("/active/:id/recommendation",      postActiveRecommendation);
router.get("/active/:id/timeline",             getTimeline);
router.post("/active/:id/ai-analysis",         triggerAIAnalysis);
router.post("/active/ai-assistant",            getAIAssistant);

/* ── Advisory management ── */
router.get("/advisories/overview",             getAdvisoryOverview);
router.get("/advisories/analytics",            getAdvisoryAnalytics);
router.get("/advisories/history",              getAdvisoryHistory);
router.get("/advisories/market-insights",      getMarketInsights);
router.post("/advisories/broadcast",           broadcastAlert);
router.post("/advisories/ai-generate",         aiGenerate);
router.get("/advisories",                      getFeed);
router.post("/advisories",                     createAdvisory);
router.get("/advisories/:id",                  getAdvisoryById);
router.put("/advisories/:id",                  updateAdvisory);
router.delete("/advisories/:id",               deleteAdvisory);
router.patch("/advisories/:id/publish",        publishAdvisory);
router.patch("/advisories/:id/status",         changeStatus);

/* ── Earnings & Revenue ── */
router.get("/earnings/overview",                getEarningsOverview);
router.get("/earnings/trends",                  getEarningsTrends);
router.get("/earnings/transactions",            getEarningsTransactions);
router.get("/earnings/commission",              getEarningsCommission);
router.get("/earnings/payouts",                 getEarningsPayouts);
router.patch("/earnings/payouts/:orderId/release", releaseEarningsPayout);
router.get("/earnings/payment-status",          getEarningsPaymentStatus);
router.get("/earnings/forecast",                getEarningsForecast);
router.post("/earnings/export",                 exportEarningsReport);

/* ── Reports & Analytics ── */
router.get("/reports/overview",          getReportsOverview);
router.get("/reports/market-trends",     getReportsMarketTrends);
router.get("/reports/demand-supply",     getReportsDemandSupply);
router.get("/reports/crop-performance",  getReportsCropPerformance);
router.get("/reports/region-analysis",   getReportsRegionAnalysis);
router.get("/reports/ai-performance",    getReportsAIPerformance);
router.get("/reports/user-analytics",    getReportsUserAnalytics);
router.post("/reports/ai-insights",      getReportsAIInsights);
router.post("/reports/generate",         generateReportExport);

export default router;
