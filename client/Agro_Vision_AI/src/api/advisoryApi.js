import api from "./axios";

const unwrap = (r) => r?.data?.data;

export const fetchAdvisoryOverview    = ()                    => api.get("/expert/advisories/overview").then(unwrap);
export const fetchAdvisoryFeed        = (params = {})         => api.get("/expert/advisories", { params }).then(unwrap);
export const fetchAdvisoryById        = (id)                  => api.get(`/expert/advisories/${id}`).then(unwrap);
export const createAdvisory           = (body)                => api.post("/expert/advisories", body).then(unwrap);
export const updateAdvisory           = (id, body)            => api.put(`/expert/advisories/${id}`, body).then(unwrap);
export const deleteAdvisory           = (id)                  => api.delete(`/expert/advisories/${id}`).then(unwrap);
export const publishAdvisory          = (id)                  => api.patch(`/expert/advisories/${id}/publish`).then(unwrap);
export const changeAdvisoryStatus     = (id, status)          => api.patch(`/expert/advisories/${id}/status`, { status }).then(unwrap);
export const broadcastAlert           = (body)                => api.post("/expert/advisories/broadcast", body).then(unwrap);
export const fetchAdvisoryAnalytics   = ()                    => api.get("/expert/advisories/analytics").then(unwrap);
export const fetchAdvisoryHistory     = (params = {})         => api.get("/expert/advisories/history", { params }).then(unwrap);
export const fetchMarketInsights      = ()                    => api.get("/expert/advisories/market-insights").then(unwrap);
export const generateAdvisoryAI       = (body)                => api.post("/expert/advisories/ai-generate", body).then(unwrap);
