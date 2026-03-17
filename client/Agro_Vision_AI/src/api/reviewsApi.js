import api from "./axios.js";
const unwrap = (r) => r?.data?.data;

export const fetchOverview        = ()       => api.get("/reviews/overview").then(unwrap);
export const fetchFeed            = (p = {}) => api.get("/reviews", { params: p }).then(unwrap);
export const fetchReviewById      = (id)     => api.get(`/reviews/${id}`).then(unwrap);
export const createReview         = (body)   => api.post("/reviews", body).then(unwrap);
export const reportReview         = (id, b)  => api.post(`/reviews/${id}/report`, b).then(unwrap);
export const moderateReview       = (id, b)  => api.patch(`/reviews/${id}/status`, b).then(unwrap);
export const fetchAnalytics       = (p = {}) => api.get("/reviews/analytics", { params: p }).then(unwrap);
export const fetchQualityReviews  = (p = {}) => api.get("/reviews/quality/list", { params: p }).then(unwrap);
export const createQualityReview  = (body)   => api.post("/reviews/quality", body).then(unwrap);
export const fetchModerationQueue = (p = {}) => api.get("/reviews/moderation/queue", { params: p }).then(unwrap);
export const analyzeSentiment     = (text)   => api.post("/reviews/ai/sentiment", { text }).then(unwrap);
export const detectSpam           = (body)   => api.post("/reviews/ai/spam", body).then(unwrap);
