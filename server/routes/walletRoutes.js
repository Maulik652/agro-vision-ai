import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validateBody, validateQuery } from "../middleware/zodValidate.js";
import {
  addMoneySchema, verifyTopupSchema,
  walletPaySchema, refundSchema, txQuerySchema,
} from "../validation/walletValidation.js";
import {
  getWallet, getTransactions, addMoney,
  verifyTopup, walletPay, refund,
} from "../controllers/walletController.js";

const router = express.Router();

router.use(protect);

// Buyer-accessible routes
router.use(authorize("buyer", "admin"));
router.get("/",              getWallet);
router.get("/transactions",  validateQuery(txQuerySchema), getTransactions);
router.post("/add-money",    validateBody(addMoneySchema),    addMoney);
router.post("/verify-topup", validateBody(verifyTopupSchema), verifyTopup);
router.post("/pay",          validateBody(walletPaySchema),   walletPay);

// Admin/system only — used by order cancellation flow
router.post("/refund", authorize("admin"), validateBody(refundSchema), refund);

export default router;
