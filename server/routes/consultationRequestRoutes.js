import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  getExperts,
  createConsultation,
  getMyConsultations,
  getMyConsultationById,
  getMessages,
  postMessage,
  payConsultation,
  getPendingPayments,
} from "../controllers/consultationRequestController.js";

const router = Router();

router.use(protect, authorize("farmer", "buyer", "admin"));

router.get("/experts",                  getExperts);
router.post("/",                        createConsultation);
router.get("/my",                       getMyConsultations);
router.get("/my/pending-payments",      getPendingPayments);
router.get("/my/:id",                   getMyConsultationById);
router.patch("/my/:id/pay",             payConsultation);
router.get("/my/:id/messages",          getMessages);
router.post("/my/:id/messages",         postMessage);

export default router;
