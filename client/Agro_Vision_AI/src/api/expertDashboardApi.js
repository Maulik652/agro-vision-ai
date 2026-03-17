import api from "./axios";

const unwrap = (res) => res?.data?.data;

export const fetchExpertOverview       = () => api.get("/expert/overview").then(unwrap);
export const fetchExpertMarketTrends   = ({ crop = "Wheat", days = 30 } = {}) =>
  api.get("/expert/market-trends", { params: { crop, days } }).then(unwrap);
export const fetchExpertAIPredictions  = ({ crop = "Wheat" } = {}) =>
  api.get("/expert/ai-predictions", { params: { crop } }).then(unwrap);
export const fetchExpertDiseaseReports = ({ limit = 20 } = {}) =>
  api.get("/expert/disease-reports", { params: { limit } }).then(unwrap);
export const fetchExpertFarmerActivity = ({ limit = 30 } = {}) =>
  api.get("/expert/farmer-activity", { params: { limit } }).then(unwrap);
export const fetchExpertCropDemand     = () => api.get("/expert/crop-demand").then(unwrap);
export const fetchExpertQualityReports = ({ limit = 20 } = {}) =>
  api.get("/expert/quality-reports", { params: { limit } }).then(unwrap);
export const postExpertRecommendation  = (body) =>
  api.post("/expert/recommendation", body).then((r) => r?.data?.data);
export const fetchExpertPlatformAnalytics = () =>
  api.get("/expert/platform-analytics").then(unwrap);
