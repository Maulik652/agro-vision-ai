import CropListing from "../models/CropListing.js";
import BuyerOffer from "../models/BuyerOffer.js";
import Order from "../models/Order.js";
import BuyerProfile from "../models/BuyerProfile.js";
import User from "../models/User.js";
import crypto from "crypto";

const toNumber = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const textSeed = (s = "") => {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = ((h * 31) + s.charCodeAt(i)) % 1000003;
  return h;
};

/* ───── Farmer Listings ───────────────────────────────────────────── */

export const getMyListings = async (farmerId, opts = {}) => {
  const { search, category, status, sortBy = "newest", page = 1, limit = 9 } = opts;

  const query = { farmer: farmerId };

  if (search) {
    query.$or = [
      { cropName: { $regex: search, $options: "i" } },
      { variety: { $regex: search, $options: "i" } },
    ];
  }
  if (category && category !== "All") {
    query.cropName = { $regex: `^${category}`, $options: "i" };
  }
  if (status && status !== "all") {
    query.status = status;
  }

  const sortMap = {
    newest:     { createdAt: -1 },
    oldest:     { createdAt: 1 },
    price_high: { price: -1 },
    price_low:  { price: 1 },
    views:      { views: -1 },
  };
  const sort = sortMap[sortBy] ?? { createdAt: -1 };

  const skip = (Number(page) - 1) * Number(limit);
  const [listings, total] = await Promise.all([
    CropListing.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
    CropListing.countDocuments(query),
  ]);

  return { listings, total, pages: Math.ceil(total / Number(limit)) || 1 };
};

export const updateListing = async (listingId, farmerId, updates) => {
  const allowed = [
    "price", "quantity", "quantityUnit", "grade", "qualityType",
    "moisturePercent", "shelfLifeDays", "packagingType", "minOrderQty",
    "negotiable", "deliveryOptions", "certifications", "tags",
    "responseSlaHours", "isActive", "status"
  ];
  const safe = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) safe[key] = updates[key];
  }

  const listing = await CropListing.findOneAndUpdate(
    { _id: listingId, farmer: farmerId },
    { $set: safe },
    { new: true, runValidators: true }
  ).lean();

  if (listing && (safe.status !== undefined || safe.isActive !== undefined || safe.quantity !== undefined)) {
    const { emitInventoryUpdate } = await import("../realtime/socketServer.js");
    emitInventoryUpdate(farmerId.toString(), {
      cropId: listing._id.toString(),
      cropName: listing.cropName,
      quantity: listing.quantity,
      status: listing.status,
      isActive: listing.isActive,
      event: "listing_updated",
    });
  }

  return listing;
};

export const deleteListing = async (listingId, farmerId) => {
  const listing = await CropListing.findOneAndDelete({
    _id: listingId,
    farmer: farmerId,
  }).lean();
  return listing;
};

export const pauseListing = async (listingId, farmerId) => {
  return updateListing(listingId, farmerId, { isActive: false, status: "paused" });
};

/* ───── Buyer Offers ──────────────────────────────────────────────── */

export const createOffer = async (data) => {
  const offer = await BuyerOffer.create(data);
  return offer.toObject();
};

export const getOffersForFarmer = async (farmerId) => {
  const offers = await BuyerOffer.find({ farmer: farmerId })
    .populate("buyer", "name email phone")
    .populate("cropListing", "cropName price quantity quantityUnit location")
    .sort({ createdAt: -1 })
    .lean();
  return offers;
};

export const getOffersForListing = async (listingId) => {
  const offers = await BuyerOffer.find({ cropListing: listingId })
    .populate("buyer", "name email phone")
    .sort({ createdAt: -1 })
    .lean();
  return offers;
};

export const respondToOffer = async (offerId, farmerId, action, counterPrice, counterMessage) => {
  const statusMap = { accept: "accepted", reject: "rejected", negotiate: "negotiating" };
  const newStatus = statusMap[action];
  if (!newStatus) throw new Error("Invalid action. Use accept, reject, or negotiate.");

  const update = { status: newStatus };
  if (action === "negotiate") {
    if (counterPrice) update.counterPrice = counterPrice;
    if (counterMessage) update.counterMessage = counterMessage;
  }

  const offer = await BuyerOffer.findOneAndUpdate(
    { _id: offerId, farmer: farmerId, status: { $in: ["pending", "negotiating"] } },
    { $set: update },
    { new: true, runValidators: true }
  )
    .populate("buyer", "name email phone")
    .populate("cropListing", "cropName price quantity quantityUnit location")
    .lean();

  return offer;
};

/* ───── Orders ────────────────────────────────────────────────────── */

const generateOrderId = () => {
  const num = crypto.randomInt(1000, 99999);
  return `ORD-${num}`;
};

export const createOrderFromOffer = async (offerId, farmerId) => {
  const offer = await BuyerOffer.findOne({ _id: offerId, farmer: farmerId, status: "accepted" })
    .populate("cropListing", "cropName quantity quantityUnit price")
    .lean();

  if (!offer) throw new Error("Accepted offer not found.");

  const totalAmount = offer.offerPrice * offer.quantity;

  const order = await Order.create({
    orderId: generateOrderId(),
    buyer: offer.buyer,
    buyerName: offer.buyerName,
    farmer: offer.farmer,
    cropListing: offer.cropListing._id || offer.cropListing,
    offer: offer._id,
    cropName: offer.cropListing.cropName,
    quantity: offer.quantity,
    quantityUnit: offer.quantityUnit,
    pricePerUnit: offer.offerPrice,
    totalAmount,
    status: "pending",
  });

  return order.toObject();
};

export const getMyOrders = async (farmerId) => {
  const orders = await Order.find({ farmer: farmerId })
    .populate("buyer", "name email phone")
    .sort({ createdAt: -1 })
    .lean();
  return orders;
};

export const updateOrderStatus = async (orderId, farmerId, status) => {
  const allowed = ["confirmed", "processing", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(status)) throw new Error("Invalid order status.");

  const order = await Order.findOneAndUpdate(
    { _id: orderId, farmer: farmerId },
    { $set: { orderStatus: status, status } },
    { new: true, runValidators: true }
  )
    .populate("buyer", "_id name email phone")
    .populate("farmer", "_id name")
    .lean();

  if (order) {
    // Emit real-time update to buyer
    const { getSocketServer } = await import("../realtime/socketServer.js");
    const io = getSocketServer();
    if (io) {
      const buyerId = order.buyer?._id?.toString() ?? order.buyer?.toString();
      const payload = {
        orderId: order._id,
        orderStatus: status,
        order,
        emittedAt: new Date().toISOString(),
      };
      if (buyerId) io.to(`user:${buyerId}`).emit("order_update", payload);
      io.to(`user:${farmerId.toString()}`).emit("order_update", payload);
    }

    // Persist notification for buyer on cancellation
    if (status === "cancelled") {
      const buyerId = order.buyer?._id?.toString() ?? order.buyer?.toString();
      if (buyerId) {
        const Notification = (await import("../models/Notification.js")).default;
        const cropName = order.items?.[0]?.cropName ?? order.cropName ?? "your crop";
        await Notification.create({
          user: buyerId,
          type: "order_cancelled",
          title: `Order Cancelled — ${cropName}`,
          message: `Your order for ${cropName} has been cancelled by the farmer. Contact the farmer for more details.`,
          data: { orderId: order._id, farmerId },
          priority: "high",
        }).catch(() => {});
      }
    }
  }

  return order;
};;

/* ───── Sales Analytics ───────────────────────────────────────────── */

export const getSalesAnalytics = async (farmerId) => {
  const listings = await CropListing.find({ farmer: farmerId }).lean();
  const orders = await Order.find({ farmer: farmerId }).lean();

  const totalListings = listings.length;
  const activeListings = listings.filter((l) => l.status === "active" && l.isActive).length;
  const soldListings = listings.filter((l) => l.status === "sold").length;

  const deliveredOrders = orders.filter((o) => o.status === "delivered");
  const totalRevenue = deliveredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalQuantitySold = deliveredOrders.reduce((s, o) => s + (o.quantity || 0), 0);
  const avgSellingPrice = deliveredOrders.length
    ? totalRevenue / deliveredOrders.reduce((s, o) => s + o.quantity, 0)
    : 0;

  const pendingOrders = orders.filter((o) => ["pending", "confirmed", "processing"].includes(o.status)).length;
  const completedOrders = deliveredOrders.length;

  const monthlySales = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    const monthOrders = deliveredOrders.filter((o) => {
      const c = new Date(o.createdAt);
      return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
    });
    monthlySales.push({
      month: label,
      revenue: monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0),
      orders: monthOrders.length,
    });
  }

  const cropBreakdown = {};
  for (const o of deliveredOrders) {
    const name = o.cropName || "Unknown";
    if (!cropBreakdown[name]) cropBreakdown[name] = { quantity: 0, revenue: 0 };
    cropBreakdown[name].quantity += o.quantity || 0;
    cropBreakdown[name].revenue += o.totalAmount || 0;
  }

  return {
    totalListings,
    activeListings,
    soldListings,
    totalRevenue: Math.round(totalRevenue),
    totalQuantitySold,
    avgSellingPrice: Number(avgSellingPrice.toFixed(2)),
    pendingOrders,
    completedOrders,
    totalOrders: orders.length,
    monthlySales,
    cropBreakdown,
  };
};

/* ───── Smart Buyer Discovery ─────────────────────────────────────── */

export const discoverBuyers = async (cropName, location) => {
  const city = String(location || "").trim().toLowerCase();
  const crop = String(cropName || "").trim();

  let buyers = await BuyerProfile.find({
    cropsInterested: { $regex: new RegExp(crop, "i") },
  })
    .populate("user", "name email phone city state")
    .lean();

  if (!buyers.length) {
    buyers = await User.find({ role: "buyer" })
      .select("name email phone city state")
      .limit(10)
      .lean();

    return buyers.map((b) => {
      const seed = textSeed(`${b.name}::${crop}`);
      return {
        buyerName: b.name,
        businessName: `${b.name} Traders`,
        email: b.email,
        phone: b.phone,
        location: b.city || city || "Nearby",
        distance: 5 + (seed % 80),
        buying: crop || "Multiple Crops",
        verified: seed % 3 !== 0,
        rating: Number((3.2 + (seed % 18) / 10).toFixed(1)),
      };
    });
  }

  return buyers.map((bp) => {
    const seed = textSeed(`${bp.businessName || "buyer"}::${crop}`);
    return {
      buyerName: bp.user?.name || bp.businessName,
      businessName: bp.businessName || bp.user?.name,
      email: bp.user?.email,
      phone: bp.user?.phone,
      location: bp.location?.city || city || "Nearby",
      distance: 5 + (seed % 80),
      buying: crop,
      verified: bp.verified || false,
      rating: bp.rating || Number((3.5 + (seed % 14) / 10).toFixed(1)),
    };
  });
};

/* ───── Harvest Insights ──────────────────────────────────────────── */

const CROP_BASE_QTL = {
  wheat: 2400, rice: 3100, cotton: 6800, maize: 2200,
  tomato: 1800, potato: 1500, onion: 2000, soybean: 4200,
  groundnut: 5400, chilli: 9600,
};
const BEST_MARKETS = {
  wheat: "Ahmedabad", rice: "Delhi", cotton: "Rajkot", maize: "Indore",
  tomato: "Nashik", potato: "Agra", onion: "Nashik", soybean: "Indore",
  groundnut: "Junagadh", chilli: "Guntur",
};

export const getHarvestInsights = async (cropName) => {
  const crop = String(cropName || "wheat").trim().toLowerCase();
  const base = CROP_BASE_QTL[crop] || 2400;
  const month = new Date().getMonth();
  const seasonal = 1 + Math.sin((month + 1) * 0.52) * 0.06;
  const marketPrice = Math.round(base * seasonal);
  const aiPrice = Math.round(marketPrice * (1.04 + Math.sin(textSeed(crop) * 0.001) * 0.03));
  const bestMarket = BEST_MARKETS[crop] || "Ahmedabad";
  const demand = aiPrice > marketPrice * 1.03 ? "High" : aiPrice > marketPrice * 0.98 ? "Medium" : "Low";

  return {
    crop: cropName || "Wheat",
    harvestReady: true,
    marketPrice,
    aiSuggestedPrice: aiPrice,
    bestMarket,
    demand,
    unit: "qtl",
  };
};

/* ───── Market Demand Indicators ──────────────────────────────────── */

export const getDemandIndicators = async () => {
  const crops = ["Wheat", "Rice", "Cotton", "Tomato", "Maize", "Potato", "Onion", "Soybean"];
  const month = new Date().getMonth();

  return crops.map((c) => {
    const seed = textSeed(`${c}::${month}`);
    const score = clamp(35 + (seed % 55), 20, 95);
    const demand = score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";
    return { crop: c, demandScore: score, demandLevel: demand };
  });
};
