import { z } from "zod";

export const cartGetQuerySchema = z.object({
  page: z.preprocess((value) => Number(value), z.number().int().min(1).optional()),
  limit: z.preprocess((value) => Number(value), z.number().int().min(1).max(100).optional())
});

export const cartAddBodySchema = z.object({
  cropListingId: z.string().min(1),
  quantity: z.number().min(1),
  unit: z.string().optional()
});

export const cartUpdateBodySchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().min(1),
  unit: z.string().optional()
});

export const cartRemoveBodySchema = z.object({
  itemId: z.string().min(1)
});

export const cartClearQuerySchema = z.object({
  confirm: z.literal("true")
});
