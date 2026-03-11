import CropListing from "../models/CropListing.js";
import MarketTrend from "../models/MarketTrend.js";
import { predictDemand, suggestPrice } from "../services/marketAIService.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseLocation = (input, fallback = {}) => {
  if (typeof input === "object" && input) {
    return {
      city: String(input.city || fallback.city || "").trim(),
      state: String(input.state || fallback.state || "").trim()
    };
  }

  const text = String(input || "").trim();
  if (!text) {
    return {
      city: String(fallback.city || "").trim(),
      state: String(fallback.state || "").trim()
    };
  }

  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
  return {
    city: parts[0] || String(fallback.city || "").trim(),
    state: parts[1] || String(fallback.state || "").trim()
  };
};

const listingResponse = (listing) => {
  const farmerDoc = listing?.farmer && typeof listing.farmer === "object" ? listing.farmer : null;

  return {
    id: String(listing._id),
    cropName: listing.cropName,
    quantity: listing.quantity,
    quantityUnit: listing.quantityUnit,
    price: listing.price,
    aiSuggestedPrice: listing.aiSuggestedPrice,
    aiConfidence: listing.aiConfidence,
    location: listing.location,
    image: listing.image,
    qualityType: listing.qualityType,
    harvestDate: listing.harvestDate,
    isActive: listing.isActive,
    views: listing.views,
    createdAt: listing.createdAt,
    farmer: {
      id: farmerDoc ? String(farmerDoc._id) : "",
      name: farmerDoc?.name || "Farmer",
      phone: farmerDoc?.phone || "",
      location: `${farmerDoc?.city || listing.location?.city || ""}, ${farmerDoc?.state || listing.location?.state || ""}`.trim(),
      rating: 4.6,
      verified: true
    }
  };
};

const syntheticTrendData = ({ cropName, location, days }) => {
  const basePrices = {
    tomato: 22,
    onion: 19,
    potato: 16,
    rice: 32,
    wheat: 28,
    maize: 24,
    cotton: 68,
    soybean: 45,
    groundnut: 54
  };

  const cropKey = String(cropName || "tomato").trim().toLowerCase();
  const base = basePrices[cropKey] || 24;

  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const date = new Date(Date.now() - (days - day) * 24 * 60 * 60 * 1000);
    const wave = Math.sin(day * 0.78) * 1.4;
    const drift = Math.cos(day * 0.55) * 0.9;
    const demand = clamp(62 + Math.sin(day * 0.64) * 14 + Math.cos(day * 0.41) * 7, 24, 92);

    return {
      date,
      cropName: cropName || "Tomato",
      location,
      pricePerKg: Number((base + wave + drift).toFixed(2)),
      demandScore: Number(demand.toFixed(1)),
      volume: Math.round(clamp(280 + Math.cos(day * 0.57) * 110, 80, 680))
    };
  });
};

export const getCrops = async (req, res) => {
  try {
    const page = clamp(toNumber(req.query.page, 1), 1, 100000);
    const limit = clamp(toNumber(req.query.limit, 12), 1, 50);
    const skip = (page - 1) * limit;

    const search = String(req.query.search || "").trim();
    const crop = String(req.query.crop || "").trim();
    const location = String(req.query.location || "").trim();
    const quality = String(req.query.quality || "").trim().toLowerCase();
    const minPrice = req.query.minPrice !== undefined ? toNumber(req.query.minPrice, NaN) : NaN;
    const maxPrice = req.query.maxPrice !== undefined ? toNumber(req.query.maxPrice, NaN) : NaN;
    const sort = String(req.query.sort || "latest").trim().toLowerCase();

    const query = { isActive: true };

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { cropName: regex },
        { "location.city": regex },
        { "location.state": regex }
      ];
    }

    if (crop) {
      query.cropName = new RegExp(`^${escapeRegex(crop)}$`, "i");
    }

    if (location) {
      const regex = new RegExp(escapeRegex(location), "i");
      query.$and = [...(query.$and || []), { $or: [{ "location.city": regex }, { "location.state": regex }] }];
    }

    if (quality && ["organic", "normal"].includes(quality)) {
      query.qualityType = quality;
    }

    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
      query.price = {};

      if (Number.isFinite(minPrice)) {
        query.price.$gte = minPrice;
      }

      if (Number.isFinite(maxPrice)) {
        query.price.$lte = maxPrice;
      }
    }

    const sortMap = {
      latest: { createdAt: -1 },
      price_low: { price: 1, createdAt: -1 },
      price_high: { price: -1, createdAt: -1 },
      quantity_high: { quantity: -1, createdAt: -1 },
      trending: { views: -1, createdAt: -1 }
    };

    const [rows, total] = await Promise.all([
      CropListing.find(query)
        .sort(sortMap[sort] || sortMap.latest)
        .skip(skip)
        .limit(limit)
        .populate("farmer", "name phone city state")
        .lean(),
      CropListing.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      listings: rows.map(listingResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch crop listings",
      detail: error.message
    });
  }
};

export const createCropListing = async (req, res) => {
  try {
    const cropName = String(req.body.cropName || "").trim();
    const quantity = toNumber(req.body.quantity, NaN);
    const price = toNumber(req.body.price, NaN);
    const qualityTypeRaw = String(req.body.qualityType || req.body.organicType || "normal").trim().toLowerCase();
    const qualityType = qualityTypeRaw === "organic" ? "organic" : "normal";

    const location = parseLocation(req.body.location, {
      city: req.user?.city,
      state: req.user?.state
    });

    const harvestDate = new Date(req.body.harvestDate || "");

    if (!cropName) {
      return res.status(400).json({ success: false, message: "cropName is required" });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: "quantity must be greater than 0" });
    }

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ success: false, message: "price must be greater than 0" });
    }

    if (!location.city || !location.state) {
      return res.status(400).json({ success: false, message: "location city and state are required" });
    }

    if (Number.isNaN(harvestDate.getTime())) {
      return res.status(400).json({ success: false, message: "Valid harvestDate is required" });
    }

    const aiPrice = await suggestPrice({
      crop: cropName,
      quantity,
      location: location.city,
      last_7_day_price: req.body.last7DayPrice,
      demand: req.body.demand
    });

    const demandPrediction = await predictDemand({
      crop: cropName,
      location: location.city,
      last_7_day_price: req.body.last7DayPrice
    });

    const listing = await CropListing.create({
      cropName,
      quantity,
      quantityUnit: String(req.body.quantityUnit || "kg").trim().toLowerCase(),
      price,
      aiSuggestedPrice: toNumber(aiPrice.suggested_price, null),
      aiConfidence: toNumber(aiPrice.confidence, null),
      location,
      image: String(req.body.image || "").trim(),
      qualityType,
      harvestDate,
      farmer: req.user._id,
      tags: Array.isArray(req.body.tags) ? req.body.tags.slice(0, 8).map((tag) => String(tag).trim()).filter(Boolean) : []
    });

    await MarketTrend.create({
      cropName,
      location,
      pricePerKg: price,
      demandScore: clamp(toNumber(demandPrediction.demand_score, 56), 0, 100),
      volume: quantity,
      date: new Date()
    });

    const created = await CropListing.findById(listing._id)
      .populate("farmer", "name phone city state")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Crop listing created successfully",
      listing: listingResponse(created),
      ai: {
        price: aiPrice,
        demand: demandPrediction
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to create crop listing",
      detail: error.message
    });
  }
};

export const getCropDetail = async (req, res) => {
  try {
    const listing = await CropListing.findById(req.params.id)
      .populate("farmer", "name phone city state")
      .lean();

    if (!listing || !listing.isActive) {
      return res.status(404).json({ success: false, message: "Crop listing not found" });
    }

    await CropListing.updateOne({ _id: listing._id }, { $inc: { views: 1 } });

    const [relatedRows, trendRows] = await Promise.all([
      CropListing.find({
        _id: { $ne: listing._id },
        cropName: listing.cropName,
        isActive: true
      })
        .sort({ createdAt: -1 })
        .limit(4)
        .populate("farmer", "name phone city state")
        .lean(),
      MarketTrend.find({
        cropName: listing.cropName,
        "location.city": listing.location?.city
      })
        .sort({ date: -1 })
        .limit(14)
        .lean()
    ]);

    const trend = [...trendRows]
      .reverse()
      .map((row) => ({
        date: row.date,
        pricePerKg: row.pricePerKg,
        demandScore: row.demandScore,
        volume: row.volume
      }));

    return res.status(200).json({
      success: true,
      listing: listingResponse(listing),
      related: relatedRows.map(listingResponse),
      trend
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch crop detail",
      detail: error.message
    });
  }
};

export const getMarketTrends = async (req, res) => {
  try {
    const days = clamp(toNumber(req.query.days, 7), 3, 30);
    const cropName = String(req.query.crop || "").trim();
    const locationText = String(req.query.location || "").trim();
    const parsedLocation = parseLocation(locationText);

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const query = { date: { $gte: startDate } };

    if (cropName) {
      query.cropName = new RegExp(`^${escapeRegex(cropName)}$`, "i");
    }

    if (parsedLocation.city) {
      query["location.city"] = new RegExp(`^${escapeRegex(parsedLocation.city)}$`, "i");
    }

    const rows = await MarketTrend.find(query).sort({ date: 1 }).lean();

    const trends = rows.length
      ? rows
      : syntheticTrendData({
        cropName: cropName || "Tomato",
        location: {
          city: parsedLocation.city || "Surat",
          state: parsedLocation.state || "Gujarat"
        },
        days
      });

    return res.status(200).json({
      success: true,
      days,
      trends: trends.map((row) => ({
        date: row.date,
        cropName: row.cropName,
        location: row.location,
        pricePerKg: Number(row.pricePerKg),
        demandScore: Number(row.demandScore),
        volume: Number(row.volume || 0)
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch market trends",
      detail: error.message
    });
  }
};

export const getHighDemandCrops = async (req, res) => {
  try {
    const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const rows = await MarketTrend.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: "$cropName",
          avgDemand: { $avg: "$demandScore" },
          avgPrice: { $avg: "$pricePerKg" },
          totalVolume: { $sum: "$volume" },
          samples: { $sum: 1 }
        }
      },
      { $sort: { avgDemand: -1, totalVolume: -1 } },
      { $limit: 8 }
    ]);

    let result = rows;

    if (!rows.length) {
      result = await CropListing.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: "$cropName",
            avgPrice: { $avg: "$price" },
            totalVolume: { $sum: "$quantity" },
            samples: { $sum: 1 }
          }
        },
        {
          $addFields: {
            avgDemand: {
              $min: [95, { $add: [40, { $divide: ["$totalVolume", 25] }] }]
            }
          }
        },
        { $sort: { avgDemand: -1, totalVolume: -1 } },
        { $limit: 8 }
      ]);
    }

    return res.status(200).json({
      success: true,
      crops: result.map((row) => ({
        cropName: row._id,
        demandScore: Number((row.avgDemand || 0).toFixed(1)),
        avgPrice: Number((row.avgPrice || 0).toFixed(2)),
        volume: Number(row.totalVolume || 0),
        samples: Number(row.samples || 0)
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch high demand crops",
      detail: error.message
    });
  }
};

export const getFarmerEarningsDashboard = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const rows = await CropListing.find({
      farmer: req.user._id,
      createdAt: { $gte: monthStart }
    })
      .select("cropName quantity price createdAt")
      .lean();

    let projectedRevenue = 0;
    const cropTotals = new Map();

    for (const row of rows) {
      const quantity = toNumber(row.quantity, 0);
      const price = toNumber(row.price, 0);
      projectedRevenue += quantity * price;

      const cropKey = String(row.cropName || "Unknown Crop");
      const previous = cropTotals.get(cropKey) || { quantity: 0, revenue: 0 };
      cropTotals.set(cropKey, {
        quantity: previous.quantity + quantity,
        revenue: previous.revenue + (quantity * price)
      });
    }

    const sortedCrops = [...cropTotals.entries()]
      .sort((left, right) => right[1].revenue - left[1].revenue);

    const topCrop = sortedCrops.length ? sortedCrops[0][0] : "None";
    const topCropRevenue = sortedCrops.length ? sortedCrops[0][1].revenue : 0;
    const avgSellingPrice = rows.length
      ? projectedRevenue / Math.max(rows.reduce((sum, row) => sum + toNumber(row.quantity, 0), 0), 1)
      : 0;

    return res.status(200).json({
      success: true,
      month: now.toLocaleString("en-IN", { month: "long", year: "numeric" }),
      analytics: {
        cropsSold: rows.length,
        revenue: Number(projectedRevenue.toFixed(2)),
        topCrop,
        topCropRevenue: Number(topCropRevenue.toFixed(2)),
        avgSellingPrice: Number(avgSellingPrice.toFixed(2))
      },
      cropBreakdown: sortedCrops.slice(0, 5).map(([cropName, values]) => ({
        cropName,
        quantity: Number(values.quantity.toFixed(2)),
        revenue: Number(values.revenue.toFixed(2))
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch farmer earnings dashboard",
      detail: error.message
    });
  }
};
