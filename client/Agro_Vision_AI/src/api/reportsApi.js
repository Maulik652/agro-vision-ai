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

/**
 * generateReport — downloads PDF or Excel directly to the browser.
 * Returns { success, filename } on completion.
 */
export const generateReport = async ({ filters = {}, format = "pdf" } = {}) => {
  const mimeTypes = {
    pdf:   "application/pdf",
    excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  const extensions = { pdf: "pdf", excel: "xlsx" };

  const response = await api.post(
    `${BASE}/generate`,
    { filters, format },
    { responseType: "blob" }
  );

  const blob = new Blob([response.data], {
    type: mimeTypes[format] || "application/octet-stream",
  });

  // Extract filename from Content-Disposition header if present
  const disposition = response.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)/i);
  const filename = match?.[1]?.trim()
    || `agrovision-report-${new Date().toISOString().slice(0, 10)}.${extensions[format] || format}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { success: true, filename };
};
