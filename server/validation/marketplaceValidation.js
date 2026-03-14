import { z } from "zod";

const objectIdPattern = /^[a-f\d]{24}$/i;

const dateInputSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const marketplaceCropIdParamSchema = z.object({
  id: z.string().regex(objectIdPattern, "Invalid crop id")
});

export const marketplaceFarmerIdParamSchema = z.object({
  id: z.string().regex(objectIdPattern, "Invalid farmer id")
});

export const marketplaceCropsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  sort: z
    .enum(["price_low", "price_high", "newest_harvest", "highest_rating", "ai_recommended"])
    .optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  organic: z.enum(["all", "true", "false"]).optional(),
  harvestFrom: dateInputSchema.optional(),
  harvestTo: dateInputSchema.optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minQuantity: z.coerce.number().min(0).optional()
});

export const marketplaceAIInsightsQuerySchema = z.object({
  crop: z.string().trim().min(2).max(100).optional(),
  category: z.string().trim().min(2).max(100).optional()
});
