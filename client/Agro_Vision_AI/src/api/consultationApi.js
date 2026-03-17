import api from "./axios";

const unwrap = (r) => r?.data?.data;

/* ── Farmer / Buyer side ─────────────────────────────────────────────────── */
export const fetchAvailableExperts       = ()          => api.get("/consultations/experts").then(unwrap);
export const createConsultationRequest   = (body)      => api.post("/consultations", body).then(unwrap);
export const fetchMyConsultations        = (params={}) => api.get("/consultations/my", { params }).then(unwrap);
export const fetchMyConsultationById     = (id)        => api.get(`/consultations/my/${id}`).then(unwrap);
export const fetchMyConsultationMessages = (id)        => api.get(`/consultations/my/${id}/messages`).then(unwrap);
export const sendMyConsultationMessage   = (id, body)  => api.post(`/consultations/my/${id}/messages`, body).then(unwrap);
export const fetchPendingPayments        = ()          => api.get("/consultations/my/pending-payments").then(unwrap);
export const payForConsultation          = (id, body)  => api.patch(`/consultations/my/${id}/pay`, body).then(unwrap);
export const runAICropAnalysis           = (body)      => api.post("/ai/crop-analysis", body).then(unwrap);

export const fetchConsultationOverview  = ()                    => api.get("/expert/consultations/overview").then(unwrap);
export const fetchConsultations         = (params = {})         => api.get("/expert/consultations", { params }).then(unwrap);
export const fetchConsultationById      = (id)                  => api.get(`/expert/consultations/${id}`).then(unwrap);
export const acceptConsultation         = (id)                  => api.patch(`/expert/consultations/${id}/accept`).then(unwrap);
export const rejectConsultation         = (id, reason)          => api.patch(`/expert/consultations/${id}/reject`, { reason }).then(unwrap);
export const scheduleConsultation       = (id, body)            => api.post(`/expert/consultations/${id}/schedule`, body).then(unwrap);
export const completeConsultation       = (id)                  => api.patch(`/expert/consultations/${id}/complete`).then(unwrap);
export const postConsultationRecommendation = (id, body)        => api.post(`/expert/consultations/${id}/recommendation`, body).then(unwrap);
export const fetchConsultationMessages  = (id)                  => api.get(`/expert/consultations/${id}/messages`).then(unwrap);
export const sendConsultationMessage    = (id, body)            => api.post(`/expert/consultations/${id}/messages`, body).then(unwrap);
export const fetchConsultationHistory   = (params = {})         => api.get("/expert/consultations/history", { params }).then(unwrap);

/* ── Active Consultation Workspace ──────────────────────────────────────── */
export const fetchActiveConsultations   = (params = {})         => api.get("/expert/consultations/active", { params }).then(unwrap);
export const fetchActiveDetail          = (id)                  => api.get(`/expert/active/${id}`).then(unwrap);
export const startActiveConsultation    = (id)                  => api.patch(`/expert/active/${id}/start`).then(unwrap);
export const completeActiveConsultation = (id)                  => api.patch(`/expert/active/${id}/complete`).then(unwrap);
export const escalateActiveConsultation = (id, reason)          => api.patch(`/expert/active/${id}/escalate`, { reason }).then(unwrap);
export const fetchActiveMessages        = (id, params = {})     => api.get(`/expert/active/${id}/messages`, { params }).then(unwrap);
export const sendActiveMessage          = (id, body)            => api.post(`/expert/active/${id}/messages`, body).then(unwrap);
export const markActiveMessagesRead     = (id)                  => api.patch(`/expert/active/${id}/messages/read`).then(unwrap);
export const postActiveRecommendation   = (id, body)            => api.post(`/expert/active/${id}/recommendation`, body).then(unwrap);
export const fetchActiveTimeline        = (id)                  => api.get(`/expert/active/${id}/timeline`).then(unwrap);
export const triggerAIAnalysis          = (id, body)            => api.post(`/expert/active/${id}/ai-analysis`, body).then(unwrap);
export const fetchAIAssistant           = (body)                => api.post("/expert/active/ai-assistant", body).then(unwrap);
