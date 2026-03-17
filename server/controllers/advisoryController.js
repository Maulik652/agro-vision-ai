import * as svc from "../services/advisoryService.js";
import aiClient from "../config/aiServiceClient.js";

const ok   = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, err) => res.status(err.status || 500).json({ success: false, message: err.message });

export const getOverview        = async (req, res) => { try { ok(res, await svc.fetchOverview(req.user._id)); } catch (e) { fail(res, e); } };
export const getFeed            = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 12 } = req.query;
    ok(res, await svc.fetchFeed(req.user._id, { status, category, page: Number(page), limit: Number(limit) }));
  } catch (e) { fail(res, e); }
};
export const getById            = async (req, res) => { try { ok(res, await svc.fetchById(req.params.id, req.user._id)); } catch (e) { fail(res, e); } };
export const createAdvisory     = async (req, res) => {
  try {
    const { title, content, summary, category, priority, targetAudience, cropTypes, regions, farmerSize, images, attachments, scheduledAt, expiresAt } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: "title and content are required" });
    ok(res, await svc.createAdvisory(req.user._id, { title, content, summary, category, priority, targetAudience, cropTypes, regions, farmerSize, images, attachments, scheduledAt, expiresAt }), 201);
  } catch (e) { fail(res, e); }
};
export const updateAdvisory     = async (req, res) => { try { ok(res, await svc.updateAdvisory(req.params.id, req.user._id, req.body)); } catch (e) { fail(res, e); } };
export const deleteAdvisory     = async (req, res) => { try { ok(res, await svc.deleteAdvisory(req.params.id, req.user._id)); } catch (e) { fail(res, e); } };
export const publishAdvisory    = async (req, res) => { try { ok(res, await svc.publishAdvisory(req.params.id, req.user._id)); } catch (e) { fail(res, e); } };
export const changeStatus       = async (req, res) => {
  try {
    const { status } = req.body;
    ok(res, await svc.changeStatus(req.params.id, req.user._id, status));
  } catch (e) { fail(res, e); }
};
export const broadcastAlert     = async (req, res) => {
  try {
    const { title, message, category, priority } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: "title and message required" });
    ok(res, await svc.broadcastAlert(req.user._id, { title, message, category, priority }));
  } catch (e) { fail(res, e); }
};
export const getAnalytics       = async (req, res) => { try { ok(res, await svc.fetchAnalytics(req.user._id)); } catch (e) { fail(res, e); } };
export const getHistory         = async (req, res) => {
  try {
    const { category, from, to, page = 1, limit = 15 } = req.query;
    ok(res, await svc.fetchHistory(req.user._id, { category, from, to, page: Number(page), limit: Number(limit) }));
  } catch (e) { fail(res, e); }
};
export const getMarketInsights  = async (req, res) => { try { ok(res, await svc.fetchMarketInsights()); } catch (e) { fail(res, e); } };

/* ── AI Advisory Generator ───────────────────────────────────────────────── */
export const aiGenerate = async (req, res) => {
  try {
    const { cropType, region, category, tone, keywords } = req.body;
    let result = null;
    try {
      const r = await aiClient.post("/advisory-generator", { cropType, region, category, tone, keywords });
      result = r.data?.data || r.data;
    } catch {
      // Fallback generation
      result = {
        title: `${category?.charAt(0).toUpperCase() + category?.slice(1) || "Crop"} Advisory: ${cropType || "General"} — ${region || "All Regions"}`,
        content: `Based on current ${category || "agricultural"} conditions in ${region || "your region"}, farmers growing ${cropType || "crops"} should take the following precautions:\n\n1. Monitor field conditions regularly\n2. Apply recommended treatments as per local guidelines\n3. Consult with local agricultural officers for region-specific advice\n4. Keep records of all interventions for future reference\n\nThis advisory is generated based on current market and environmental data.`,
        summary: `Important ${category || "agricultural"} advisory for ${cropType || "crop"} farmers in ${region || "all regions"}.`,
        suggestedTitles: [
          `Urgent: ${cropType || "Crop"} ${category || "Advisory"} for ${region || "All Regions"}`,
          `${region || "Regional"} ${category?.charAt(0).toUpperCase() + category?.slice(1) || "Crop"} Alert — Action Required`,
          `Expert Advisory: Managing ${cropType || "Crop"} Issues This Season`
        ]
      };
    }
    ok(res, result);
  } catch (e) { fail(res, e); }
};
