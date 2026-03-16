/**
 * Cart Validation Schemas — Zod
 * Unit-aware: kg (min 10), quintal (min 1), ton (min 1)
 * All quantities must be whole integers.
 */
import { z } from "zod";

const mongoId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format");

export const UNIT_MIN_ORDER = { kg: 10, quintal: 1, ton: 1 };

/** Convert any unit quantity to kg for stock comparison */
export const toKg = (qty, unit) => {
  if (unit === "ton")     return qty * 1000;
  if (unit === "quintal") return qty * 100;
  return qty; // kg default
};

export const addToCartSchema = z.object({
  cropId:   mongoId,
  quantity: z.number({ coerce: true }).int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  unit:     z.enum(["kg", "quintal", "ton"]).optional(),
});

export const updateCartSchema = z.object({
  quantity: z.number({ coerce: true }).int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  unit:     z.enum(["kg", "quintal", "ton"]).optional(),
});

export const cropIdParamSchema = z.object({
  cropId: mongoId,
});

export const deliveryEstimateSchema = z.object({
  buyerState: z.string().min(2).max(60).optional(),
});
