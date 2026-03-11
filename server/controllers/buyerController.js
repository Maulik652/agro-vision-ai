import BuyerProfile from "../models/BuyerProfile.js";
import CropListing from "../models/CropListing.js";
import User from "../models/User.js";
import { predictDemand } from "../services/marketAIService.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const textSeed = (value = "") => {
  let hash = 0;

  for (let index = 0; index < String(value).length; index += 1) {
    hash = ((hash * 31) + String(value).charCodeAt(index)) % 1000003;
  }

  return hash;
};

const profileResponse = (profile) => {
  const userDoc = profile?.user && typeof profile.user === "object" ? profile.user : null;

  return {
    id: String(profile._id),
    userId: userDoc ? String(userDoc._id) : String(profile.user || ""),
    name: userDoc?.name || "Buyer",
    phone: userDoc?.phone || "",
    businessName: profile.businessName,
    location: {
      city: profile.location?.city || userDoc?.city || "",
      state: profile.location?.state || userDoc?.state || ""
    },
    cropsInterested: Array.isArray(profile.cropsInterested) ? profile.cropsInterested : [],
    rating: Number(profile.rating || 0),
    verified: Boolean(profile.verified)
  };
};

export const getNearbyBuyers = async (req, res) => {
  try {
    const location = String(req.query.location || "").trim();
    const crop = String(req.query.crop || "").trim();
    const page = clamp(toNumber(req.query.page, 1), 1, 100000);
    const limit = clamp(toNumber(req.query.limit, 10), 1, 40);
    const skip = (page - 1) * limit;

    const query = {};

    if (location) {
      const regex = new RegExp(escapeRegex(location), "i");
      query.$or = [{ "location.city": regex }, { "location.state": regex }];
    }

    if (crop) {
      const regex = new RegExp(`^${escapeRegex(crop)}$`, "i");
      query.cropsInterested = { $in: [regex] };
    }

    const [rows, total] = await Promise.all([
      BuyerProfile.find(query)
        .sort({ verified: -1, rating: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name phone city state")
        .lean(),
      BuyerProfile.countDocuments(query)
    ]);

    if (rows.length) {
      return res.status(200).json({
        success: true,
        buyers: rows.map(profileResponse),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit))
        }
      });
    }

    const fallbackQuery = { role: "buyer" };
    if (location) {
      const regex = new RegExp(escapeRegex(location), "i");
      fallbackQuery.$or = [{ city: regex }, { state: regex }];
    }

    const fallbackRows = await User.find(fallbackQuery)
      .select("name phone city state")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      buyers: fallbackRows.map((buyer) => ({
        id: String(buyer._id),
        userId: String(buyer._id),
        name: buyer.name,
        phone: buyer.phone,
        businessName: `${buyer.name} Agri Traders`,
        location: {
          city: buyer.city,
          state: buyer.state
        },
        cropsInterested: crop ? [crop] : [],
        rating: 4.3,
        verified: false
      })),
      pagination: {
        page,
        limit,
        total: fallbackRows.length,
        totalPages: 1
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch nearby buyers",
      detail: error.message
    });
  }
};

export const getMyBuyerProfile = async (req, res) => {
  try {
    const profile = await BuyerProfile.findOne({ user: req.user._id })
      .populate("user", "name phone city state")
      .lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Buyer profile not found"
      });
    }

    return res.status(200).json({
      success: true,
      profile: profileResponse(profile)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch buyer profile",
      detail: error.message
    });
  }
};

export const upsertBuyerProfile = async (req, res) => {
  try {
    const businessName = String(req.body.businessName || "").trim();

    if (!businessName) {
      return res.status(400).json({ success: false, message: "businessName is required" });
    }

    const city = String(req.body.city || req.body.location?.city || req.user.city || "").trim();
    const state = String(req.body.state || req.body.location?.state || req.user.state || "").trim();

    if (!city || !state) {
      return res.status(400).json({
        success: false,
        message: "city and state are required"
      });
    }

    const cropsInterested = Array.isArray(req.body.cropsInterested)
      ? req.body.cropsInterested.map((crop) => String(crop).trim()).filter(Boolean).slice(0, 20)
      : [];

    const rating = clamp(toNumber(req.body.rating, 4.4), 0, 5);
    const verified = Boolean(req.body.verified);

    const profile = await BuyerProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        businessName,
        location: { city, state },
        cropsInterested,
        rating,
        verified,
        notes: String(req.body.notes || "")
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate("user", "name phone city state")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Buyer profile saved",
      profile: profileResponse(profile)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to save buyer profile",
      detail: error.message
    });
  }
};

export const getSmartBuyerAlerts = async (req, res) => {
  try {
    const crop = String(req.query.crop || "Tomato").trim() || "Tomato";
    const location = String(req.query.location || req.user?.city || "Surat").trim() || "Surat";
    const quantity = clamp(toNumber(req.query.quantity, 500), 50, 20000);

    const regexLocation = new RegExp(escapeRegex(location), "i");
    const regexCrop = new RegExp(`^${escapeRegex(crop)}$`, "i");

    let buyers = await BuyerProfile.find({
      $or: [{ "location.city": regexLocation }, { "location.state": regexLocation }],
      cropsInterested: { $in: [regexCrop] }
    })
      .sort({ verified: -1, rating: -1, updatedAt: -1 })
      .limit(6)
      .populate("user", "name phone city state")
      .lean();

    if (!buyers.length) {
      const fallbackUsers = await User.find({ role: "buyer", $or: [{ city: regexLocation }, { state: regexLocation }] })
        .select("name phone city state")
        .limit(6)
        .lean();

      buyers = fallbackUsers.map((row) => ({
        _id: row._id,
        user: row,
        businessName: `${row.name} Agri Traders`,
        location: { city: row.city, state: row.state },
        cropsInterested: [crop],
        rating: 4.3,
        verified: false
      }));
    }

    const [demand, listingStats] = await Promise.all([
      predictDemand({ crop, location }),
      CropListing.aggregate([
        { $match: { isActive: true, cropName: regexCrop } },
        {
          $group: {
            _id: "$cropName",
            avgPrice: { $avg: "$price" },
            totalQuantity: { $sum: "$quantity" }
          }
        },
        { $limit: 1 }
      ])
    ]);

    const expectedPrice = toNumber(demand?.expected_price, toNumber(listingStats?.[0]?.avgPrice, 22));
    const baseQuantity = Math.max(200, Math.round(quantity * 0.9));

    const alerts = buyers.slice(0, 4).map((buyer, index) => {
      const seed = textSeed(`${buyer._id}-${crop}-${location}-${index}`);
      const quantityDemand = Math.max(120, Math.round(baseQuantity * (0.76 + ((seed % 31) / 100))));
      const offerPrice = Number((expectedPrice * (0.95 + ((seed % 13) / 100))).toFixed(2));
      const urgency = seed % 3 === 0 ? "high" : seed % 3 === 1 ? "medium" : "low";

      return {
        id: String(buyer._id),
        buyerName: buyer.businessName || buyer.user?.name || "Buyer",
        location: `${buyer.location?.city || location}, ${buyer.location?.state || ""}`.replace(/,\s*$/, ""),
        quantityDemand,
        offerPrice,
        urgency,
        message: `Buyer in ${buyer.location?.city || location} wants ${quantityDemand}kg ${crop}`,
        phone: buyer.user?.phone || ""
      };
    });

    return res.status(200).json({
      success: true,
      crop,
      location,
      demandLevel: demand?.demand_level || "MEDIUM",
      alerts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to generate smart buyer alerts",
      detail: error.message
    });
  }
};
