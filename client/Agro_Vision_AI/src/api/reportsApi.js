import api from "./axios.js";

const unwrap = (r) => r?.data?.data;
const BASE = "/expert/reports";

export const fetchOverview        = (params) => api.get(`${BASE}/overview`, { params }).then(unwrap);
export const fetchMarketTrends    = (params) => api.get(`${BASE}/market-trends`, { params }).then(unwrap);
export const fetchDemandSupply    = (params) => api.get(`${BASE}/demand-supply`, { params }).then(unwrap);
export const fetchCropPerformance = (params) => api.get(`${BASE}/crop-performance`, { params }).then(unwrap);
export const fetchRegionAnalysis  = (params) => api.get(`${BASE}/region-analysis`, { params }).then(unwrap);
export const fetchAIPerformance   = ()        => api.get(`${BASE}/ai-performance`).then(unwrap);
export const fetchUserAnalytics   = (params) => api.get(`${BASE}/user-analytics`, { params }).then(unwrap);
export const fetchAIInsights      = ()        => api.post(`${BASE}/ai-insights`).then(unwrap);
export const generateReport       = (body)   => api.post(`${BASE}/generate`, body).then(unwrap);
