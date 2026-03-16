import { z } from "zod";

const coerceInt = (min, max, def) =>
  z.preprocess((v) => (v === undefined || v === "" ? def : Number(v)), z.number().int().min(min).max(max));

export const addMoneySchema = z.object({
  amount:  z.number().positive().max(100000),
  gateway: z.enum(["razorpay", "stripe"]),
});

export const verifyTopupSchema = z.object({
  gateway:               z.enum(["razorpay", "stripe"]),
  referenceId:           z.string().min(1),
  razorpay_order_id:     z.string().optional(),
  razorpay_payment_id:   z.string().optional(),
  razorpay_signature:    z.string().optional(),
  stripe_payment_intent: z.string().optional(),
});

export const walletPaySchema = z.object({
  amount:      z.number().positive(),
  referenceId: z.string().min(1),
  description: z.string().max(200).optional(),
});

export const refundSchema = z.object({
  userId:      z.string().regex(/^[a-f\d]{24}$/i),
  amount:      z.number().positive(),
  referenceId: z.string().min(1),
  description: z.string().max(200).optional(),
});

export const txQuerySchema = z.object({
  page:     coerceInt(1, 9999, 1),
  limit:    coerceInt(1, 50, 20),
  category: z.enum(["topup", "order_payment", "refund", "escrow_release", "all"]).optional().default("all"),
});
