import BuyerProfile from "../models/BuyerProfile.js";
import CropListing from "../models/CropListing.js";
import MarketTrend from "../models/MarketTrend.js";
import { buildSellAssistant, estimateLogistics, predictDemand, suggestPrice } from "../services/marketAIService.js";
import { emitNewCropListing } from "../realtime/socketServer.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const average = (rows = []) => {
  if (!rows.length) {
    return 0;
  }

  return rows.reduce((sum, value) => sum + value, 0) / rows.length;
};

const median = (rows = []) => {
  if (!rows.length) {
    return 0;
  }

  const sorted = [...rows].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
};

const toDateText = (value) => {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });
};

const diffDays = (from, to = new Date()) => {
  const left = new Date(from || Date.now());
  const right = new Date(to || Date.now());

  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) {
    return 0;
  }

  return Math.round((left.getTime() - right.getTime()) / (24 * 60 * 60 * 1000));
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
    variety: listing.variety || "",
    grade: listing.grade || "B",
    price: listing.price,
    aiSuggestedPrice: listing.aiSuggestedPrice,
    aiConfidence: listing.aiConfidence,
    aiSellReadiness: listing.aiSellReadiness,
    aiPriceBand: listing.aiPriceBand || null,
    aiUrgency: listing.aiUrgency || null,
    location: listing.location,
    image: listing.image,
    qualityType: listing.qualityType,
    moisturePercent: listing.moisturePercent,
    shelfLifeDays: listing.shelfLifeDays,
    packagingType: listing.packagingType,
    minOrderQty: listing.minOrderQty,
    negotiable: listing.negotiable,
    deliveryOptions: Array.isArray(listing.deliveryOptions) ? listing.deliveryOptions : [],
    certifications: Array.isArray(listing.certifications) ? listing.certifications : [],
    responseSlaHours: listing.responseSlaHours,
    harvestDate: listing.harvestDate,
    isActive: listing.isActive,
    status: listing.status,
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
    const grade = String(req.query.grade || "").trim().toUpperCase();
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

    if (grade && ["A", "B", "C"].includes(grade)) {
      query.grade = grade;
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
      best_fit: { aiSellReadiness: -1, aiConfidence: -1, createdAt: -1 },
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
    const variety = String(req.body.variety || "").trim();
    const quantity = toNumber(req.body.quantity, NaN);
    const price = toNumber(req.body.price, NaN);
    const qualityTypeRaw = String(req.body.qualityType || req.body.organicType || "normal").trim().toLowerCase();
    const qualityType = qualityTypeRaw === "organic" ? "organic" : "normal";
    const grade = ["A", "B", "C"].includes(String(req.body.grade || "B").trim().toUpperCase())
      ? String(req.body.grade || "B").trim().toUpperCase()
      : "B";
    const moisturePercent = req.body.moisturePercent !== undefined
      ? clamp(toNumber(req.body.moisturePercent, NaN), 0, 100)
      : null;
    const shelfLifeDays = clamp(toNumber(req.body.shelfLifeDays, 7), 1, 45);
    const packagingType = String(req.body.packagingType || "standard-bag").trim().toLowerCase() || "standard-bag";
    const minOrderQty = Math.max(1, toNumber(req.body.minOrderQty, 50));
    const negotiable = req.body.negotiable === undefined ? true : Boolean(req.body.negotiable);
    const responseSlaHours = clamp(toNumber(req.body.responseSlaHours, 12), 1, 72);
    const deliveryOptions = Array.isArray(req.body.deliveryOptions)
      ? req.body.deliveryOptions
        .map((item) => String(item).trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6)
      : ["farm-pickup"];
    const certifications = Array.isArray(req.body.certifications)
      ? req.body.certifications.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
      : [];

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

    const sellAssistant = await buildSellAssistant({
      crop: cropName,
      quantity,
      location: location.city,
      demand: demandPrediction?.demand_level || req.body.demand,
      last_7_day_price: req.body.last7DayPrice,
      qualityType,
      shelfLifeDays,
      moisturePercent,
      grade,
      packagingType
    });

    const listing = await CropListing.create({
      cropName,
      variety,
      quantity,
      quantityUnit: String(req.body.quantityUnit || "kg").trim().toLowerCase(),
      grade,
      price,
      aiSuggestedPrice: toNumber(aiPrice.suggested_price, null),
      aiConfidence: toNumber(aiPrice.confidence, null),
      aiSellReadiness: toNumber(sellAssistant.readiness_score, null),
      aiPriceBand: {
        min: toNumber(sellAssistant?.recommended_price_band?.min, null),
        ideal: toNumber(sellAssistant?.recommended_price_band?.ideal, null),
        max: toNumber(sellAssistant?.recommended_price_band?.max, null)
      },
      aiUrgency: String(sellAssistant?.urgency || "").trim().toUpperCase() || null,
      location,
      image: String(req.body.image || "").trim(),
      qualityType,
      moisturePercent: Number.isFinite(moisturePercent) ? moisturePercent : null,
      shelfLifeDays,
      packagingType,
      minOrderQty,
      negotiable,
      deliveryOptions: deliveryOptions.length ? deliveryOptions : ["farm-pickup"],
      certifications,
      responseSlaHours,
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

    emitNewCropListing({
      listingId: String(listing._id),
      cropName,
      variety,
      price,
      quantity,
      location,
      farmerId: String(req.user._id)
    });

    return res.status(201).json({
      success: true,
      message: "Crop listing created successfully",
      listing: listingResponse(created),
      ai: {
        price: aiPrice,
        demand: demandPrediction,
        sellAssistant
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

    emitNewCropListing({
      listingId: String(listing._id),
      cropName,
      variety,
      price,
      quantity,
      location
    });

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

export const getFarmerMarketIntelligence = async (req, res) => {
  try {
    const crop = String(req.query.crop || "Tomato").trim() || "Tomato";
    const days = clamp(toNumber(req.query.days, 14), 7, 45);

    const parsedLocation = parseLocation(req.query.location, {
      city: req.user?.city,
      state: req.user?.state
    });

    const city = parsedLocation.city || req.user?.city || "Surat";
    const state = parsedLocation.state || req.user?.state || "Gujarat";

    const cropRegex = new RegExp(`^${escapeRegex(crop)}$`, "i");
    const locationRegex = new RegExp(escapeRegex(city), "i");
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [marketListings, farmerListings, trendRows, heatmapRows, buyerRows] = await Promise.all([
      CropListing.find({
        isActive: true,
        cropName: cropRegex,
        $or: [{ "location.city": locationRegex }, { "location.state": locationRegex }]
      })
        .sort({ aiSellReadiness: -1, createdAt: -1 })
        .limit(100)
        .populate("farmer", "name phone city state")
        .lean(),
      CropListing.find({
        farmer: req.user._id,
        isActive: true,
        cropName: cropRegex
      })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate("farmer", "name phone city state")
        .lean(),
      MarketTrend.find({
        cropName: cropRegex,
        "location.city": locationRegex,
        date: { $gte: fromDate }
      })
        .sort({ date: 1 })
        .lean(),
      MarketTrend.aggregate([
        {
          $match: {
            cropName: cropRegex,
            date: { $gte: fromDate }
          }
        },
        {
          $group: {
            _id: "$location.city",
            avgDemand: { $avg: "$demandScore" },
            avgPrice: { $avg: "$pricePerKg" },
            volume: { $sum: "$volume" }
          }
        },
        { $sort: { avgDemand: -1, volume: -1 } },
        { $limit: 8 }
      ]),
      BuyerProfile.find({
        $or: [{ "location.city": locationRegex }, { "location.state": locationRegex }],
        cropsInterested: { $in: [cropRegex] }
      })
        .sort({ verified: -1, rating: -1, updatedAt: -1 })
        .limit(8)
        .populate("user", "name phone")
        .lean()
    ]);

    const trendSeriesRaw = trendRows.length
      ? trendRows
      : syntheticTrendData({
        cropName: crop,
        location: { city, state },
        days
      });

    const trendSeries = trendSeriesRaw.map((row) => ({
      date: row.date,
      pricePerKg: Number(toNumber(row.pricePerKg, 0).toFixed(2)),
      demandScore: Number(toNumber(row.demandScore, 0).toFixed(1)),
      volume: Number(toNumber(row.volume, 0).toFixed(0))
    }));

    const priceSeries = trendSeries.map((row) => row.pricePerKg).filter((row) => row > 0);
    const demandSeries = trendSeries.map((row) => row.demandScore).filter((row) => row > 0);

    const currentPrice = priceSeries.length ? priceSeries[priceSeries.length - 1] : 0;
    const avgPrice = average(priceSeries);
    const medianPrice = median(priceSeries);
    const demandScore = average(demandSeries);
    const volatilityPct = avgPrice
      ? (average(priceSeries.map((value) => Math.abs(value - avgPrice))) / avgPrice) * 100
      : 0;

    const firstPrice = priceSeries[0] || currentPrice;
    const priceDeltaPct = firstPrice
      ? ((currentPrice - firstPrice) / firstPrice) * 100
      : 0;

    const demandLevel = demandScore >= 72 ? "HIGH" : demandScore >= 46 ? "MEDIUM" : "LOW";
    const trendDirection = priceDeltaPct >= 2 ? "up" : priceDeltaPct <= -2 ? "down" : "flat";

    const benchmarkQuantity = Math.round(median(marketListings.map((row) => toNumber(row.quantity, 0)).filter(Boolean)) || 500);

    const [aiSellStrategy, laneEstimate] = await Promise.all([
      buildSellAssistant({
        crop,
        quantity: benchmarkQuantity,
        location: city,
        demand: demandLevel,
        shelfLifeDays: 7,
        grade: "B",
        qualityType: "normal"
      }),
      estimateLogistics({
        pickup: "Farm Cluster",
        drop: `${city} Market`,
        vehicleType: "mini-truck"
      })
    ]);

    const pipelineRows = farmerListings.map(listingResponse);

    const expiringSoon = pipelineRows.filter((row) => {
      const daysLeft = diffDays(row.harvestDate);
      return daysLeft >= 0 && daysLeft <= 2;
    }).length;
    const highReadiness = pipelineRows.filter((row) => toNumber(row.aiSellReadiness, 0) >= 75).length;
    const underPriced = pipelineRows.filter((row) => {
      const ideal = toNumber(row.aiPriceBand?.ideal, NaN);
      return Number.isFinite(ideal) && toNumber(row.price, 0) < ideal * 0.94;
    }).length;

    const marketCards = marketListings
      .slice(0, 8)
      .map((row) => listingResponse(row))
      .map((row) => ({
        id: row.id,
        cropName: row.cropName,
        grade: row.grade || "B",
        price: row.price,
        quantity: row.quantity,
        quantityUnit: row.quantityUnit,
        location: `${row.location?.city || city}, ${row.location?.state || state}`,
        readiness: toNumber(row.aiSellReadiness, 58),
        urgency: row.aiUrgency || "MEDIUM",
        farmerName: row.farmer?.name || "Farmer"
      }));

    const demandHeatmap = heatmapRows.length
      ? heatmapRows.map((row) => ({
        city: row._id || "Unknown",
        demandScore: Number(toNumber(row.avgDemand, 0).toFixed(1)),
        avgPrice: Number(toNumber(row.avgPrice, 0).toFixed(2)),
        volume: Number(toNumber(row.volume, 0).toFixed(0))
      }))
      : [{ city, demandScore: Number(demandScore.toFixed(1)), avgPrice: Number(avgPrice.toFixed(2)), volume: 0 }];

    const buyerRadar = buyerRows.map((row, index) => {
      const fitScore = clamp(
        52 + toNumber(row.rating, 4.2) * 7 + (row.verified ? 9 : 0) + (index === 0 ? 5 : 0),
        48,
        96
      );

      return {
        id: String(row._id),
        businessName: row.businessName,
        city: row.location?.city || city,
        state: row.location?.state || state,
        rating: Number(toNumber(row.rating, 4.2).toFixed(1)),
        verified: Boolean(row.verified),
        fitScore: Math.round(fitScore),
        phone: row.user?.phone || "",
        cropsInterested: Array.isArray(row.cropsInterested) ? row.cropsInterested : []
      };
    });

    const alerts = [];
    if (volatilityPct >= 8.5) {
      alerts.push({
        level: "warning",
        title: "High price volatility",
        message: "Split stock into multiple listing lots to reduce downside risk.",
        action: "Use phased listing"
      });
    }

    if (demandLevel === "LOW") {
      alerts.push({
        level: "critical",
        title: "Demand cooling",
        message: `Demand for ${crop} is weakening near ${city}. Prioritize nearby buyer conversion.`,
        action: "Boost visibility + discount 2-4%"
      });
    }

    if (demandLevel !== "LOW" && aiSellStrategy?.readiness_score >= 74) {
      alerts.push({
        level: "success",
        title: "Premium sell window active",
        message: `Current market pulse supports premium pricing for ${crop}.`,
        action: "Target verified buyers first"
      });
    }

    const farmerQuantity = farmerListings.reduce((sum, row) => sum + toNumber(row.quantity, 0), 0);
    const baselineRevenue = farmerListings.reduce((sum, row) => sum + (toNumber(row.quantity, 0) * toNumber(row.price, 0)), 0);
    const optimizedRevenue = farmerListings.reduce((sum, row) => {
      const ideal = toNumber(row.aiPriceBand?.ideal, NaN);
      const fallback = toNumber(row.aiSuggestedPrice, toNumber(row.price, 0));
      const unit = Number.isFinite(ideal) ? ideal : fallback;
      return sum + (toNumber(row.quantity, 0) * unit);
    }, 0);

    const upsideAmount = optimizedRevenue - baselineRevenue;
    const upsidePct = baselineRevenue ? (upsideAmount / baselineRevenue) * 100 : 0;

    return res.status(200).json({
      success: true,
      meta: {
        crop,
        location: { city, state },
        days,
        generatedAt: new Date().toISOString()
      },
      summary: {
        activeLocalListings: marketListings.length,
        activeFarmerListings: farmerListings.length,
        buyerMatches: buyerRadar.length,
        trendDirection,
        currentPrice: Number(currentPrice.toFixed(2)),
        avgPrice: Number(avgPrice.toFixed(2)),
        medianPrice: Number(medianPrice.toFixed(2)),
        priceDeltaPct: Number(priceDeltaPct.toFixed(2)),
        volatilityPct: Number(volatilityPct.toFixed(2)),
        demandScore: Number(demandScore.toFixed(1)),
        demandLevel
      },
      hero: {
        title: `${crop} Command Center`,
        subtitle: `${city} mandi pulse, buyer matching, and AI selling strategy in one workspace.`,
        badges: [
          `${marketListings.length} active listings`,
          `${buyerRadar.length} buyer matches`,
          `${demandLevel} demand`
        ]
      },
      kpis: [
        {
          key: "price",
          label: "Current Market Price",
          value: `Rs ${Number(currentPrice.toFixed(2))}/kg`,
          change: `${priceDeltaPct >= 0 ? "+" : ""}${Number(priceDeltaPct.toFixed(1))}%`,
          tone: trendDirection === "up" ? "positive" : trendDirection === "down" ? "negative" : "neutral"
        },
        {
          key: "demand",
          label: "Demand Strength",
          value: `${Number(demandScore.toFixed(1))}/100`,
          change: demandLevel,
          tone: demandLevel === "HIGH" ? "positive" : demandLevel === "LOW" ? "negative" : "neutral"
        },
        {
          key: "match",
          label: "Buyer Match Rate",
          value: `${toNumber(aiSellStrategy?.expected_buyer_match_rate, 64)}%`,
          change: `${buyerRadar.length} priority buyers`,
          tone: "positive"
        },
        {
          key: "readiness",
          label: "Sell Readiness",
          value: `${toNumber(aiSellStrategy?.readiness_score, 62)}/100`,
          change: String(aiSellStrategy?.urgency || "MEDIUM"),
          tone: aiSellStrategy?.urgency === "HIGH" ? "negative" : "neutral"
        }
      ],
      trendSeries,
      demandHeatmap,
      opportunityBoard: marketCards,
      buyerRadar,
      listingPipeline: {
        total: pipelineRows.length,
        highReadiness,
        expiringSoon,
        underPriced,
        totalQuantity: Number(farmerQuantity.toFixed(1)),
        items: pipelineRows.slice(0, 8).map((row) => ({
          id: row.id,
          cropName: row.cropName,
          grade: row.grade,
          quantity: row.quantity,
          quantityUnit: row.quantityUnit,
          listedPrice: row.price,
          idealPrice: toNumber(row.aiPriceBand?.ideal, toNumber(row.aiSuggestedPrice, row.price)),
          readiness: toNumber(row.aiSellReadiness, 58),
          urgency: row.aiUrgency || "MEDIUM",
          harvestDate: row.harvestDate,
          harvestText: toDateText(row.harvestDate)
        }))
      },
      sellWindows: [
        {
          slot: "05:30 AM - 08:30 AM",
          confidence: clamp(62 + demandScore * 0.3, 55, 95),
          priceHint: `Rs ${Number((currentPrice * 1.03).toFixed(2))}/kg`,
          action: "Push premium lots first",
          why: "Highest buyer search activity for fresh lots before mandi rush."
        },
        {
          slot: "11:30 AM - 01:30 PM",
          confidence: clamp(56 + demandScore * 0.24, 50, 90),
          priceHint: `Rs ${Number((currentPrice * 0.99).toFixed(2))}/kg`,
          action: "Negotiate bulk contracts",
          why: "Institutional buyers finalize bulk quantities during midday windows."
        },
        {
          slot: "05:00 PM - 07:00 PM",
          confidence: clamp(58 + demandScore * 0.22, 50, 88),
          priceHint: `Rs ${Number((currentPrice * 1.01).toFixed(2))}/kg`,
          action: "Close pending deals",
          why: "Strong closure probability for buyers who compare same-day listings."
        }
      ],
      logisticsLane: {
        pickup: laneEstimate?.pickup || "Farm Cluster",
        drop: laneEstimate?.drop || `${city} Market`,
        distanceKm: toNumber(laneEstimate?.distance_km, 0),
        etaHours: toNumber(laneEstimate?.eta_hours, 0),
        costInr: toNumber(laneEstimate?.estimated_cost_inr, 0),
        recommendedVehicle: laneEstimate?.recommended_vehicle || "mini-truck"
      },
      smartAlerts: alerts,
      revenueForecast: {
        baselineRevenue: Number(baselineRevenue.toFixed(2)),
        optimizedRevenue: Number(optimizedRevenue.toFixed(2)),
        upsideAmount: Number(upsideAmount.toFixed(2)),
        upsidePct: Number(upsidePct.toFixed(2))
      },
      negotiationPlaybook: [
        {
          title: "Anchor With Quality Evidence",
          whenToUse: "When buyer asks for discount before seeing lot details",
          script: "This lot has grade, moisture, and shelf-life details verified. Let us start near AI fair range and close quickly on volume."
        },
        {
          title: "Bundle By Delivery Speed",
          whenToUse: "When buyer wants immediate transport",
          script: "I can commit same-day pickup window if we close within the upper half of the suggested price band."
        },
        {
          title: "Split-Lot Closing",
          whenToUse: "When buyer hesitates on total quantity",
          script: "Let us confirm first tranche now and reserve the remaining lot at today's market-linked price."
        }
      ],
      quickActions: [
        { label: "Create Premium Listing", path: "/farmer/sell-crop", type: "primary" },
        { label: "Open Marketplace Grid", path: "/farmer/marketplace", type: "secondary" },
        { label: "Review Crop Detail", path: "/marketplace/crop", type: "secondary" }
      ],
      aiSellAssistant: aiSellStrategy
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch farmer market intelligence",
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
