import { z } from "zod";

const mongoId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

/* ── Address ─────────────────────────────────────────────────── */
export const createAddressSchema = z.object({
  fullName:   z.string().min(2).max(100),
  phone:      z.string().min(7).max(20),
  street:     z.string().min(3).max(200),
  city:       z.string().min(2).max(100),
  state:      z.string().min(2).max(100),
  postalCode: z.string().min(4).max(10),
  isDefault:  z.boolean().optional().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export const addressIdSchema = z.object({ id: mongoId });

/* ── Order ───────────────────────────────────────────────────── */
export const createOrderSchema = z.object({
  addressId:    mongoId,
  deliveryType: z.enum(["standard", "express"]).default("standard"),
  paymentMethod:z.enum(["razorpay", "stripe", "wallet"]).default("razorpay"),
});

/* ── Payment ─────────────────────────────────────────────────── */
export const createPaymentOrderSchema = z.object({
  parentOrderId: z.string().min(1),
  gateway:       z.enum(["razorpay", "stripe"]),
});

export const verifyPaymentSchema = z.object({
  parentOrderId:          z.string().min(1),
  razorpay_order_id:      z.string().optional(),
  razorpay_payment_id:    z.string().optional(),
  razorpay_signature:     z.string().optional(),
  stripe_payment_intent:  z.string().optional(),
});
