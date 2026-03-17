import api from "./axios";

const unwrap = (res) => res?.data?.data;

export const fetchAdminDashboard = () => api.get("/admin/dashboard").then(unwrap);
export const fetchLiveActivity = () => api.get("/admin/live-activity").then(unwrap);

export const fetchAdminUsers = (params) => api.get("/admin/users", { params }).then((r) => r.data);
export const updateUserStatus = (id, status) => api.patch(`/admin/users/${id}/status`, { status }).then(unwrap);
export const updateUserRole = (id, role) => api.patch(`/admin/users/${id}/role`, { role }).then(unwrap);
export const deleteAdminUser = (id) => api.delete(`/admin/users/${id}`).then(unwrap);

export const fetchAdminListings = (params) => api.get("/admin/listings", { params }).then((r) => r.data);
export const updateListingStatus = (id, status) => api.patch(`/admin/listings/${id}/status`, { status }).then(unwrap);

export const fetchAdminOrders = (params) => api.get("/admin/orders", { params }).then((r) => r.data);
export const updateOrderStatus = (id, status) => api.patch(`/admin/orders/${id}/status`, { status }).then(unwrap);

export const fetchFinancialStats = () => api.get("/admin/financial").then(unwrap);
export const fetchAIStats = () => api.get("/admin/ai-stats").then(unwrap);

export const fetchAdminReviews = (params) => api.get("/admin/reviews", { params }).then((r) => r.data);
export const updateReviewStatus = (id, action) => api.patch(`/admin/reviews/${id}/status`, { action }).then(unwrap);

export const fetchFraudAlerts = () => api.get("/admin/fraud-alerts").then(unwrap);
export const resolveFraudAlert = (id, body) => api.patch(`/admin/fraud-alerts/${id}/resolve`, body).then(unwrap);

export const fetchReports = (params) => api.get("/admin/reports", { params }).then(unwrap);

export const fetchSettings = () => api.get("/admin/settings").then(unwrap);
export const updateSettings = (data) => api.put("/admin/settings", data).then(unwrap);

export const fetchActivityLogs = (params) => api.get("/admin/activity-logs", { params }).then((r) => r.data);

export const fetchAutomationRules = () => api.get("/admin/automation-rules").then(unwrap);
export const createAutomationRule = (data) => api.post("/admin/automation-rules", data).then(unwrap);
export const updateAutomationRule = (id, data) => api.put(`/admin/automation-rules/${id}`, data).then(unwrap);
export const deleteAutomationRule = (id) => api.delete(`/admin/automation-rules/${id}`).then(unwrap);

export const fetchNotificationsCenter = () => api.get("/admin/notifications-center").then(unwrap);
export const fetchAdminProfile = () => api.get("/admin/profile").then(unwrap);

// Consultations
export const fetchAdminConsultations = (params) => api.get("/admin/consultations", { params }).then((r) => r.data);
export const fetchConsultationStats = () => api.get("/admin/consultations/stats").then(unwrap);
export const updateConsultationStatus = (id, status) => api.patch(`/admin/consultations/${id}/status`, { status }).then(unwrap);

// Experts
export const fetchAdminExperts = (params) => api.get("/admin/experts", { params }).then((r) => r.data);
export const fetchExpertPayouts = () => api.get("/admin/experts/payouts").then(unwrap);
export const releaseExpertPayout = (id) => api.patch(`/admin/experts/payouts/${id}/release`).then(unwrap);

// Advisories
export const fetchAdminAdvisories = (params) => api.get("/admin/advisories", { params }).then((r) => r.data);
export const updateAdvisoryStatus = (id, status) => api.patch(`/admin/advisories/${id}/status`, { status }).then(unwrap);
export const deleteAdvisoryAdmin = (id) => api.delete(`/admin/advisories/${id}`).then(unwrap);

// Wallet & Escrow
export const fetchWalletOverview = () => api.get("/admin/wallet/overview").then(unwrap);
export const fetchWalletTransactions = (params) => api.get("/admin/wallet/transactions", { params }).then((r) => r.data);

// Community
export const fetchAdminCommunity = (params) => api.get("/admin/community", { params }).then((r) => r.data);
export const updateCommunityPostStatus = (id, body) => api.patch(`/admin/community/${id}/status`, body).then(unwrap);
export const deleteCommunityPost = (id) => api.delete(`/admin/community/${id}`).then(unwrap);

// Schemes
export const fetchAdminSchemes = (params) => api.get("/admin/schemes", { params }).then((r) => r.data);
export const createAdminScheme = (data) => api.post("/admin/schemes", data).then(unwrap);
export const updateAdminScheme = (id, data) => api.put(`/admin/schemes/${id}`, data).then(unwrap);
export const deleteAdminScheme = (id) => api.delete(`/admin/schemes/${id}`).then(unwrap);

// Scan Reports
export const fetchScanReportsDeep = (params) => api.get("/admin/scan-reports", { params }).then((r) => r.data);

// Review Analytics
export const fetchReviewAnalytics = () => api.get("/admin/review-analytics").then(unwrap);

// Broadcast
export const broadcastNotification = (data) => api.post("/admin/broadcast", data).then(unwrap);

// Platform Analytics
export const fetchPlatformAnalytics = () => api.get("/admin/platform-analytics").then(unwrap);
