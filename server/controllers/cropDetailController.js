import mongoose from "mongoose";
import CropListing from "../models/CropListing.js";
import MarketplaceCrop from "../models/MarketplaceCrop.js";
import CropReview from "../models/CropReview.js";
import MarketplaceFarmer from "../models/MarketplaceFarmer.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { getCache, setCache } from "../config/redis.js";

const CROP_DETAIL_TTL_SECONDS = 300;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
};

const textSeed = (value = "") => {
  let hash = 0;
  const text = String(value || "");

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) % 1_000_003;
  }

  return hash;
};

const buildQualityMetrics = (crop) => {
  const qualityGrade = String(crop.qualityGrade || crop.grade || "B").trim().toUpperCase() || "B";
  const moisturePercentage = toNumber(
    crop.moistureLevel ?? crop.moisturePercent,
    qualityGrade === "A" ? 11.8 : qualityGrade === "B" ? 13.4 : 15.2
  );

  const gradeBias = qualityGrade === "A" ? 1 : qualityGrade === "B" ? 0.65 : 0.35;
  const seed = textSeed(String(crop._id || crop.id || "crop"));

  const grainPurity = Math.min(99, Math.max(55, Math.round(74 + (gradeBias * 20) - (moisturePercentage - 12) + ((seed % 5) - 2))));
  const sizeConsistency = Math.min(99, Math.max(50, Math.round(70 + (gradeBias * 18) + ((seed % 7) - 3))));
  const storageCondition = Math.min(99, Math.max(52, Math.round(73 + (gradeBias * 14) - ((seed % 9) - 4))));

  return {
    moisturePercentage: Number(moisturePercentage.toFixed(1)),
    grainPurity,
    sizeConsistency,
    storageCondition
  };
};

const normalizeCrop = (crop) => {
  const id = String(crop._id || crop.id || "");
  const cropName = String(crop.cropName || "Crop").trim() || "Crop";
  const category = String(crop.category || crop.cropName || "General").trim() || "General";
  const images = Array.isArray(crop.images)
    ? crop.images.filter(Boolean)
    : [crop.image].filter(Boolean);

  return {
    id,
    cropName,
    category,
    pricePerKg: toNumber(crop.pricePerKg ?? crop.price, 0),
    quantityAvailable: toNumber(crop.quantityAvailable ?? crop.quantity, 0),
    harvestDate: crop.harvestDate || crop.createdAt,
    moistureLevel: toNumber(crop.moistureLevel ?? crop.moisturePercent, 0),
    qualityGrade: String(crop.qualityGrade || crop.grade || "B").trim().toUpperCase() || "B",
    organicCertified: Boolean(crop.organicCertified || crop.qualityType === "organic"),
    images,
    farmerId: String(crop.farmerId || crop.farmer?._id || crop.farmer || ""),
    location: crop.location || {
      city: crop.city || "",
      state: crop.state || ""
    },
    createdAt: crop.createdAt,
    qualityMetrics: buildQualityMetrics(crop)
  };
};

const fetchCropById = async (cropId) => {
  const objectId = asObjectId(cropId);
  if (!objectId) {
    return null;
  }

  const marketplaceCrop = await MarketplaceCrop.findById(objectId).lean();
  if (marketplaceCrop) {
    return {
      source: "marketplace-crop",
      raw: marketplaceCrop,
      crop: normalizeCrop(marketplaceCrop)
    };
  }

  const listing = await CropListing.findOne({
    _id: objectId,
    isActive: true,
    status: "active"
  })
    .populate("farmer", "name city state certifications")
    .lean();

  if (!listing) {
    return null;
  }

  return {
    source: "crop-listing",
    raw: listing,
    crop: normalizeCrop(listing)
  };
};

const buildFarmerProfile = async (farmerId, cropFallback = null) => {
  const objectId = asObjectId(farmerId);

  if (!objectId) {
    return {
      id: "",
      name: "Farmer",
      farmLocation: "",
      rating: 4.4,
      certifications: [],
      totalSales: 0
    };
  }

  const [marketplaceFarmer, user, reviewStats, salesStats] = await Promise.all([
    MarketplaceFarmer.findOne({ $or: [{ _id: objectId }, { userId: objectId }] }).lean(),
    User.findById(objectId).select("name city state certifications").lean(),
    CropReview.aggregate([
      { $match: { farmerId: objectId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 }
        }
      }
    ]),
    Order.aggregate([
      { $match: { farmer: objectId } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" }
        }
      }
    ])
  ]);

  const rating = marketplaceFarmer?.rating
    ?? (reviewStats[0]?.avgRating != null ? Number(reviewStats[0].avgRating.toFixed(1)) : null)
    ?? 4.4;

  const fallbackLocation = [
    cropFallback?.location?.city || "",
    cropFallback?.location?.state || ""
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: String(user?._id || marketplaceFarmer?.userId || objectId),
    name: user?.name || marketplaceFarmer?.name || "Farmer",
    farmLocation:
      marketplaceFarmer?.farmLocation
      || [user?.city || "", user?.state || ""].filter(Boolean).join(", ")
      || fallbackLocation,
    rating: Number(toNumber(rating, 4.4).toFixed(1)),
    certifications:
      (marketplaceFarmer?.certifications && marketplaceFarmer.certifications.length
        ? marketplaceFarmer.certifications
        : Array.isArray(user?.certifications)
          ? user.certifications
          : []),
    totalSales: Number(
      toNumber(marketplaceFarmer?.totalSales, salesStats[0]?.totalSales || 0).toFixed(2)
    ),
    totalReviews: toNumber(reviewStats[0]?.totalReviews, 0)
  };
};

const shapeSimilarCrop = (crop) => ({
  id: String(crop._id),
  cropName: String(crop.cropName || "Crop"),
  category: String(crop.category || crop.cropName || "General"),
  pricePerKg: toNumber(crop.pricePerKg ?? crop.price, 0),
  quantityAvailable: toNumber(crop.quantityAvailable ?? crop.quantity, 0),
  image: Array.isArray(crop.images) && crop.images.length ? crop.images[0] : crop.image || "",
  location: crop.location || {},
  harvestDate: crop.harvestDate,
  organicCertified: Boolean(crop.organicCertified || crop.qualityType === "organic")
});

export const getCropDetailById = async (req, res) => {
  try {
    const cropId = req.validatedParams?.id || req.params.id;
    const cacheKey = `crop_detail_${cropId}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const cropRecord = await fetchCropById(cropId);

    if (!cropRecord) {
      return res.status(404).json({
        success: false,
        message: "Crop not found"
      });
    }

    const farmer = await buildFarmerProfile(cropRecord.crop.farmerId, cropRecord.raw);

    const response = {
      success: true,
      crop: cropRecord.crop,
      farmer
    };

    await setCache(cacheKey, response, CROP_DETAIL_TTL_SECONDS);

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch crop detail",
      detail: error.message
    });
  }
};

export const getCropReviewsById = async (req, res) => {
  try {
    const cropId = req.validatedParams?.id || req.params.id;
    const page = toNumber(req.validatedQuery?.page ?? req.query.page, 1);
    const limit = toNumber(req.validatedQuery?.limit ?? req.query.limit, 6);
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);

    const objectId = asObjectId(cropId);
    if (!objectId) {
      return res.status(400).json({ success: false, message: "Invalid crop id" });
    }

    const [rows, total, ratingStats] = await Promise.all([
      CropReview.find({ cropId: objectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("buyerId", "name")
        .lean(),
      CropReview.countDocuments({ cropId: objectId }),
      CropReview.aggregate([
        { $match: { cropId: objectId } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" }
          }
        }
      ])
    ]);

    return res.status(200).json({
      success: true,
      reviews: rows.map((review) => ({
        id: String(review._id),
        buyerId: String(review.buyerId?._id || review.buyerId || ""),
        buyerName: review.buyerId?.name || "Buyer",
        rating: review.rating,
        reviewText: review.reviewText || "",
        createdAt: review.createdAt
      })),
      pagination: {
        page: Math.max(1, page),
        limit: Math.max(1, limit),
        total,
        totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit)))
      },
      avgRating: ratingStats[0]?.avgRating != null ? Number(ratingStats[0].avgRating.toFixed(1)) : 0
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch crop reviews",
      detail: error.message
    });
  }
};

export const upsertCropReview = async (req, res) => {
  try {
    const cropId = req.validatedParams?.id || req.params.id;
    const { rating, reviewText } = req.validatedBody || req.body;

    const cropRecord = await fetchCropById(cropId);

    if (!cropRecord) {
      return res.status(404).json({
        success: false,
        message: "Crop not found"
      });
    }

    const review = await CropReview.findOneAndUpdate(
      {
        cropId,
        buyerId: req.user._id
      },
      {
        $set: {
          farmerId: cropRecord.crop.farmerId,
          rating: toNumber(rating, 0),
          reviewText: String(reviewText || "").trim()
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    )
      .populate("buyerId", "name")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Review saved",
      review: {
        id: String(review._id),
        buyerId: String(review.buyerId?._id || req.user._id),
        buyerName: review.buyerId?.name || req.user.name || "Buyer",
        rating: review.rating,
        reviewText: review.reviewText,
        createdAt: review.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save review",
      detail: error.message
    });
  }
};

export const getSimilarCropsById = async (req, res) => {
  try {
    const cropId = req.validatedParams?.id || req.params.id;
    const limit = toNumber(req.validatedQuery?.limit ?? req.query.limit, 10);

    const cropRecord = await fetchCropById(cropId);

    if (!cropRecord) {
      return res.status(404).json({
        success: false,
        message: "Crop not found"
      });
    }

    const safeLimit = Math.max(1, Math.min(30, limit));

    let similarRows = [];

    if (cropRecord.source === "marketplace-crop") {
      similarRows = await MarketplaceCrop.find({
        _id: { $ne: cropRecord.raw._id },
        $or: [
          { category: cropRecord.crop.category },
          {
            pricePerKg: {
              $gte: Math.max(0, cropRecord.crop.pricePerKg * 0.75),
              $lte: cropRecord.crop.pricePerKg * 1.25
            }
          }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .lean();
    } else {
      similarRows = await CropListing.find({
        _id: { $ne: cropRecord.raw._id },
        isActive: true,
        status: "active",
        $or: [
          { cropName: cropRecord.raw.cropName },
          { category: cropRecord.raw.category },
          {
            price: {
              $gte: Math.max(0, cropRecord.crop.pricePerKg * 0.75),
              $lte: cropRecord.crop.pricePerKg * 1.25
            }
          }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .lean();
    }

    const similarCrops = similarRows
      .map(shapeSimilarCrop)
      .map((item) => {
        const sameCategory = item.category.toLowerCase() === cropRecord.crop.category.toLowerCase();
        const priceGap = Math.abs(item.pricePerKg - cropRecord.crop.pricePerKg);
        const priceScore = Math.max(0, 1 - (priceGap / Math.max(1, cropRecord.crop.pricePerKg)));
        const aiRecommendation = Number((sameCategory ? 0.55 : 0.3) + (priceScore * 0.45)).toFixed(2);

        return {
          ...item,
          aiRecommendation: Number(aiRecommendation)
        };
      });

    return res.status(200).json({
      success: true,
      similarCrops
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch similar crops",
      detail: error.message
    });
  }
};
