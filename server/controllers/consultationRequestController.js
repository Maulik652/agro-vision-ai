import * as svc from "../services/consultationRequestService.js";

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, data });
const err = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message || "Server error" });

export const getExperts            = async (req, res) => { try { ok(res, await svc.fetchExperts(req.query)); } catch (e) { err(res, e); } };
export const createConsultation    = async (req, res) => { try { ok(res, await svc.createConsultationRequest(req.user._id, req.body), 201); } catch (e) { err(res, e); } };
export const getMyConsultations    = async (req, res) => { try { ok(res, await svc.fetchMyConsultations(req.user._id, req.query)); } catch (e) { err(res, e); } };
export const getMyConsultationById = async (req, res) => { try { ok(res, await svc.fetchMyConsultationById(req.params.id, req.user._id)); } catch (e) { err(res, e); } };
export const getMessages           = async (req, res) => { try { ok(res, await svc.fetchUserMessages(req.params.id, req.user._id)); } catch (e) { err(res, e); } };
export const postMessage           = async (req, res) => { try { ok(res, await svc.sendUserMessage(req.params.id, req.user._id, req.body), 201); } catch (e) { err(res, e); } };
export const payConsultation       = async (req, res) => { try { ok(res, await svc.payConsultation(req.params.id, req.user._id, req.body)); } catch (e) { err(res, e); } };
export const getPendingPayments    = async (req, res) => { try { ok(res, await svc.fetchPendingPayments(req.user._id)); } catch (e) { err(res, e); } };
