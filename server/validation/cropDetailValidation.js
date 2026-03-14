import { z } from "zod";

const objectIdPattern = /^[a-f\d]{24}$/i;

export const cropIdParamSchema = z.object({
  id: z.string().regex(objectIdPattern, "Invalid crop id")
});

export const farmerIdParamSchema = z.object({
  id: z.string().regex(objectIdPattern, "Invalid farmer id")
});

export const aiCropInsightsParamSchema = z.object({
  cropId: z.string().regex(objectIdPattern, "Invalid crop id")
});

export const cropReviewBodySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  reviewText: z
    .string()
    .trim()
    .min(3, "reviewText must be at least 3 characters")
    .max(1000, "reviewText must be less than 1000 characters")
});

export const cartAddBodySchema = z.object({
  cropId: z.string().regex(objectIdPattern, "Invalid crop id"),
  farmerId: z.string().regex(objectIdPattern, "Invalid farmer id"),
  quantity: z.coerce.number().positive("quantity must be greater than 0"),
  buyNow: z.coerce.boolean().optional(),
  note: z.string().trim().max(300).optional()
});

export const cropReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export const similarCropsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).optional()
});
