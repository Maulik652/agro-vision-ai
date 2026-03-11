import api from "./axios";

/* ═══════════════ FarmGPT ═══════════════ */
export const sendFarmGPTMessage = async (question, sessionId, farmContext) => {
  const response = await api.post("/farmgpt/chat", { question, sessionId, farmContext });
  return response.data;
};

export const getFarmGPTSessions = async () => {
  const response = await api.get("/farmgpt/sessions");
  return response.data;
};

export const getFarmGPTSession = async (sessionId) => {
  const response = await api.get(`/farmgpt/session/${sessionId}`);
  return response.data;
};

export const deleteFarmGPTSession = async (sessionId) => {
  const response = await api.delete(`/farmgpt/session/${sessionId}`);
  return response.data;
};

/* ═══════════════ Crop Calendar ═══════════════ */
export const getCalendarActivities = async (params = {}) => {
  const response = await api.get("/calendar", { params });
  return response.data;
};

export const generateCalendar = async (cropType, sowingDate, fieldId) => {
  const response = await api.post("/calendar/generate", { cropType, sowingDate, fieldId });
  return response.data;
};

export const addCalendarActivity = async (data) => {
  const response = await api.post("/calendar", data);
  return response.data;
};

export const updateCalendarActivity = async (id, data) => {
  const response = await api.patch(`/calendar/${id}`, data);
  return response.data;
};

export const deleteCalendarActivity = async (id) => {
  const response = await api.delete(`/calendar/${id}`);
  return response.data;
};

export const getUpcomingActivities = async () => {
  const response = await api.get("/calendar/upcoming");
  return response.data;
};

/* ═══════════════ Expense Tracker ═══════════════ */
export const getExpenses = async (params = {}) => {
  const response = await api.get("/expenses", { params });
  return response.data;
};

export const addExpense = async (data) => {
  const response = await api.post("/expenses", data);
  return response.data;
};

export const updateExpense = async (id, data) => {
  const response = await api.patch(`/expenses/${id}`, data);
  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
};

export const getExpenseSummary = async (params = {}) => {
  const response = await api.get("/expenses/summary", { params });
  return response.data;
};

/* ═══════════════ Farm Fields ═══════════════ */
export const getFarmFields = async () => {
  const response = await api.get("/fields");
  return response.data;
};

export const addFarmField = async (data) => {
  const response = await api.post("/fields", data);
  return response.data;
};

export const updateFarmField = async (id, data) => {
  const response = await api.patch(`/fields/${id}`, data);
  return response.data;
};

export const deleteFarmField = async (id) => {
  const response = await api.delete(`/fields/${id}`);
  return response.data;
};

export const getFarmFieldsSummary = async () => {
  const response = await api.get("/fields/summary");
  return response.data;
};

/* ═══════════════ Notifications ═══════════════ */
export const getNotifications = async (params = {}) => {
  const response = await api.get("/notifications", { params });
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.patch("/notifications/read-all");
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

/* ═══════════════ Community ═══════════════ */
export const getCommunityPosts = async (params = {}) => {
  const response = await api.get("/community", { params });
  return response.data;
};

export const getCommunityPost = async (id) => {
  const response = await api.get(`/community/${id}`);
  return response.data;
};

export const createCommunityPost = async (data) => {
  const response = await api.post("/community", data);
  return response.data;
};

export const replyCommunityPost = async (id, content) => {
  const response = await api.post(`/community/${id}/reply`, { content });
  return response.data;
};

export const voteCommunityPost = async (id, type) => {
  const response = await api.post(`/community/${id}/vote`, { type });
  return response.data;
};

/* ═══════════════ Government Schemes ═══════════════ */
export const getSchemes = async (params = {}) => {
  const response = await api.get("/schemes", { params });
  return response.data;
};

export const getSchemeDetail = async (id) => {
  const response = await api.get(`/schemes/${id}`);
  return response.data;
};

/* ═══════════════ Satellite ═══════════════ */
export const getSatelliteBoundary = async () => {
  const response = await api.get("/satellite/farm-boundary");
  return response.data;
};

export const getSatelliteNDVI = async () => {
  const response = await api.get("/satellite/ndvi");
  return response.data;
};

export const getSatelliteVegetation = async () => {
  const response = await api.get("/satellite/vegetation-analysis");
  return response.data;
};
