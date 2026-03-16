import { z } from "zod";

const normalizeCsv = (value) => {
	if (Array.isArray(value)) {
		return value
			.map((item) => String(item || "").trim())
			.filter(Boolean);
	}

	const text = String(value || "").trim();
	if (!text) {
		return [];
	}

	return text
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
};

export const dashboardPriceTrendsQuerySchema = z.object({
	crop: z.string().trim().min(2).max(80).optional(),
	days: z.coerce.number().int().refine((value) => [30, 60, 90].includes(value), {
		message: "days must be one of 30, 60, 90"
	}).optional()
});

export const dashboardRecentOrdersQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(25).optional()
});

export const dashboardTopFarmersQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(12).optional()
});

export const dashboardFavoriteCropsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(12).optional()
});

export const dashboardRecommendationsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(15).optional(),
	cropFilter: z.preprocess(normalizeCsv, z.array(z.string().trim().min(2).max(80)).max(20).optional())
});
