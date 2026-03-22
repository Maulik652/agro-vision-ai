import mongoose from "mongoose";
import CropListing from "../models/CropListing.js";
import CropReview from "../models/CropReview.js";
import CropPriceHistory from "../models/CropPriceHistory.js";
import User from "../models/User.js";
import { getCache, setCache, deleteCache } from "../config/redis.js";
import { getSocketServer } from "../realtime/socketServer.js";

const DETAIL_TTL = 300;   // 5 min
const SIMILAR_TTL = 600;  // 10 min
const REVIEWS_TTL = 120;  // 2 min

const toNumber = (v, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const escapeRegex = (v) => String(v || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ── synthetic 14-day trend when no DB history exists ── */
const syntheticTrend = (cropName, basePrice, days = 14) => {
  const base = Math.max(5, toNumber(basePrice, 25));
  const key = String(cropName || "").toLowerCase();
  const seed = [...key].reduce((h, c) => ((h * 31) + c.charCodeAt(0)) % 1_000_003, 0);

  return Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const date = new Date(Date.now() - (days - day) * 86_400_000);
    const wave = Math.sin(day * 0.78) * 1.4;
    const drift = Math.cos(day * 0.55) * 0.9;
    const demand = clamp(62 + Math.sin(day * 0.64) * 14 + Math.cos(day * 0.41) * 7, 24, 92);
    return {
      date,
      pricePerKg: Number((base + wave + drift + ((seed % 5) * 0.1)).toFixed(2)),
      demandScore: Number(demand.toFixed(1)),
      volume: Math.round(clamp(280 + Math.cos(day * 0.57) * 110, 80, 680)),
    };
  });
};

/* ── shape a listing doc into the API response ── */
const formatListing = (listing) => {
  const farmer = listing?.farmer && typeof listing.farmer === "object" ? listing.farmer : null;
  return {
    id: String(listing._id),
    cropName: listing.cropName,
    variety: listing.variety || "",
    quantity: listing.quantity,
    quantityUnit: listing.quantityUnit,
    grade: listing.grade || "B",
    price: listing.price,
    aiSuggestedPrice: listing.aiSuggestedPrice ?? null,
    aiConfidence: listing.aiConfidence ?? null,
    aiSellReadiness: listing.aiSellReadiness ?? null,
    aiPriceBand: listing.aiPriceBand ?? null,
    aiUrgency: listing.aiUrgency ?? null,
    location: listing.location,
    image: listing.image || "",
    qualityType: listing.qualityType,
    moisturePercent: listing.moisturePercent ?? null,
    shelfLifeDays: listing.shelfLifeDays ?? 7,
    packagingType: listing.packagingType || "standard-bag",
    minOrderQty: listing.minOrderQty ?? 1,
    negotiable: listing.negotiable ?? true,
    deliveryOptions: Array.isArray(listing.deliveryOptions) ? listing.deliveryOptions : [],
    certifications: Array.isArray(listing.certifications) ? listing.certifications : [],
    responseSlaHours: listing.responseSlaHours ?? 12,
    harvestDate: listing.harvestDate,
    isActive: listing.isActive,
    status: listing.status,
    views: listing.views ?? 0,
    tags: Array.isArray(listing.tags) ? listing.tags : [],
    createdAt: listing.createdAt,
    farmer: {
      id: farmer ? String(farmer._id) : "",
      name: farmer?.name || "Farmer",
      phone: farmer?.phone || "",
      location: [farmer?.city || listing.location?.city, farmer?.state || listing.location?.state]
        .filter(Boolean).join(", "),
      rating: 4.6,
      verified: true,
    },
  };
};

/* ════════════════════════════════════════════════════════════════
   GET /api/crops/:id
   Full crop detail with 14-day price trend, Redis cached.
════════════════════════════════════════════════════════════════ */
export const getCropDetailById = async (req, res) => {
  try {
    const id = req.validatedParams?.id || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid crop id" });
    }

    const cacheKey = `crop_detail_${id}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    const listing = await CropListing.findById(id)
      .populate("farmer", "name phone city state")
      .lean();

    if (!listing || !listing.isActive) {
      return res.status(404).json({ success: false, message: "Crop listing not found" });
    }

    // Increment views (fire-and-forget)
    CropListing.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec().catch(() => {});

    // Fetch 14-day price history
    const historyRows = await CropPriceHistory.find({
      cropName: { $regex: `^${escapeRegex(listing.cropName)}$`, $options: "i" },
    })
      .sort({ date: -1 })
      .limit(14)
      .lean();

    const trendData = historyRows.length >= 3
      ? historyRows.reverse().map((r) => ({
          date: r.date,
          pricePerKg: toNumber(r.price, listing.price),
          demandScore: 60,  // not stored in CropPriceHistory
          volume: 300,
        }))
      : syntheticTrend(listing.cropName, listing.price, 14);

    const payload = {
      success: true,
      data: { ...formatListing(listing), trendData },
    };

    await setCache(cacheKey, payload, DETAIL_TTL);
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch crop detail", detail: err.message });
  }
};

/* ════════════════════════════════════════════════════════════════
   GET /api/crops/:id/similar
   Same crop name or same location, excluding current listing.
════════════════════════════════════════════════════════════════ */
export const getSimilarCropsById = async (req, res) => {
  try {
    const id = req.validatedParams?.id || req.params.id;
    const limit = clamp(toNumber(req.validatedQuery?.limit ?? req.query.limit, 6), 1, 30);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid crop id" });
    }

    const cacheKey = `crop_similar_${id}_${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    const source = await CropListing.findById(id).lean();
    if (!source) {
      return res.status(404).json({ success: false, message: "Crop not found" });
    }

    const rows = await CropListing.find({
      _id: { $ne: new mongoose.Types.ObjectId(id) },
      isActive: true,
      status: "active",
      $or: [
        { cropName: { $regex: `^${escapeRegex(source.cropName)}$`, $options: "i" } },
        { "location.state": source.location?.state },
      ],
    })
      .sort({ aiSellReadiness: -1, createdAt: -1 })
      .limit(limit)
      .populate("farmer", "name city state")
      .lean();

    const payload = {
      success: true,
      data: rows.map(formatListing),
    };

    await setCache(cacheKey, payload, SIMILAR_TTL);
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch similar crops", detail: err.message });
  }
};

/* ════════════════════════════════════════════════════════════════
   GET /api/crops/:id/reviews
   Paginated reviews with buyer name populated.
════════════════════════════════════════════════════════════════ */
export const getCropReviewsById = async (req, res) => {
  try {
    const id = req.validatedParams?.id || req.params.id;
    const page = clamp(toNumber(req.validatedQuery?.page ?? req.query.page, 1), 1, 500);
    const limit = clamp(toNumber(req.validatedQuery?.limit ?? req.query.limit, 10), 1, 50);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid crop id" });
    }

    const cacheKey = `crop_reviews_${id}_${page}_${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    const cropObjectId = new mongoose.Types.ObjectId(id);
    const [reviews, total] = await Promise.all([
      CropReview.find({ cropId: cropObjectId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("buyerId", "name")
        .lean(),
      CropReview.countDocuments({ cropId: cropObjectId }),
    ]);

    const payload = {
      success: true,
      data: reviews.map((r) => ({
        id: String(r._id),
        rating: r.rating,
        reviewText: r.reviewText || "",
        buyer: { id: String(r.buyerId?._id || ""), name: r.buyerId?.name || "Buyer" },
        createdAt: r.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };

    await setCache(cacheKey, payload, REVIEWS_TTL);
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch reviews", detail: err.message });
  }
};

/* ════════════════════════════════════════════════════════════════
   POST /api/crops/:id/reviews
   Upsert — one review per buyer per crop.
════════════════════════════════════════════════════════════════ */
export const upsertCropReview = async (req, res) => {
  try {
    const id = req.validatedParams?.id || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid crop id" });
    }

    const cropObjectId = new mongoose.Types.ObjectId(id);
    const listing = await CropListing.findById(cropObjectId).lean();
    if (!listing) {
      return res.status(404).json({ success: false, message: "Crop listing not found" });
    }

    const rating = toNumber(req.validatedBody?.rating ?? req.body.rating, NaN);
    const reviewText = String(req.validatedBody?.reviewText ?? req.body.reviewText ?? req.body.comment ?? "").trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "rating must be 1–5" });
    }

    const review = await CropReview.findOneAndUpdate(
      { cropId: cropObjectId, buyerId: req.user._id },
      {
        $set: {
          cropId: cropObjectId,
          buyerId: req.user._id,
          farmerId: listing.farmer,
          rating,
          reviewText,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Bust reviews cache for this crop
    await deleteCache(`crop_reviews_${id}_1_10`);

    // Emit real-time event to all viewers of this crop detail page
    const io = getSocketServer();
    if (io) {
      io.to(`crop:${id}`).emit("crop_review_added", {
        cropId: id,
        rating,
        emittedAt: new Date().toISOString(),
      });
      // Also notify the farmer
      if (listing.farmer) {
        io.to(`farmer:${String(listing.farmer)}`).emit("new_review", {
          cropId: id,
          rating,
          sentiment: "unanalyzed",
          emittedAt: new Date().toISOString(),
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        id: String(review._id),
        rating: review.rating,
        reviewText: review.reviewText,
        createdAt: review.createdAt,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already reviewed this crop" });
    }
    return res.status(500).json({ success: false, message: "Failed to submit review", detail: err.message });
  }
};
