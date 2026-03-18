import {
  getMyListings,
  updateListing,
  deleteListing,
  pauseListing,
  createOffer,
  getOffersForFarmer,
  getOffersForListing,
  respondToOffer,
  createOrderFromOffer,
  getMyOrders,
  updateOrderStatus,
  getSalesAnalytics,
  discoverBuyers,
  getHarvestInsights,
  getDemandIndicators,
} from "../services/sellCropService.js";
import Notification from "../models/Notification.js";
import { getSocketServer } from "../realtime/socketServer.js";

const sanitize = (v) => String(v || "").trim().slice(0, 200);
const toNumber = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

/* ───── Farmer Listings ───────────────────────────────────────────── */

export const farmerMyListings = async (req, res) => {
  try {
    const { search, category, status, sortBy, page = 1, limit = 9 } = req.query;
    const result = await getMyListings(req.user._id, { search, category, status, sortBy, page, limit });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const farmerUpdateListing = async (req, res) => {
  try {
    const listing = await updateListing(req.params.id, req.user._id, req.body);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

    return res.status(200).json({ success: true, listing });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const farmerDeleteListing = async (req, res) => {
  try {
    const listing = await deleteListing(req.params.id, req.user._id);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });
    return res.status(200).json({ success: true, message: "Listing deleted." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const farmerPauseListing = async (req, res) => {
  try {
    const listing = await pauseListing(req.params.id, req.user._id);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });
    return res.status(200).json({ success: true, listing });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ───── Buyer Offers ──────────────────────────────────────────────── */

export const submitOffer = async (req, res) => {
  try {
    const offerPrice = toNumber(req.body.offerPrice, NaN);
    const quantity = toNumber(req.body.quantity, NaN);
    if (!Number.isFinite(offerPrice) || offerPrice <= 0)
      return res.status(400).json({ success: false, message: "offerPrice required." });
    if (!Number.isFinite(quantity) || quantity <= 0)
      return res.status(400).json({ success: false, message: "quantity required." });
    if (!req.body.cropListing)
      return res.status(400).json({ success: false, message: "cropListing ID required." });
    if (!req.body.farmer)
      return res.status(400).json({ success: false, message: "farmer ID required." });

    const offer = await createOffer({
      buyer: req.user._id,
      buyerName: req.user.name || "",
      cropListing: req.body.cropListing,
      farmer: req.body.farmer,
      offerPrice,
      quantity,
      quantityUnit: req.body.quantityUnit || "quintal",
      message: sanitize(req.body.message),
    });

    // Notify farmer in real-time that a new offer arrived
    const io = getSocketServer();
    if (io) {
      io.to(`user:${req.body.farmer}`).emit("new_offer", {
        offerId: offer._id,
        buyerName: req.user.name || "A buyer",
        offerPrice,
        quantity,
        cropListingId: req.body.cropListing,
        message: `New offer of ₹${offerPrice} received`,
      });
    }

    // Persist notification for farmer
    await Notification.create({
      user: req.body.farmer,
      type: "new_offer",
      title: `New Offer — ₹${offerPrice}`,
      message: `${req.user.name || "A buyer"} made an offer of ₹${offerPrice} for ${quantity} ${req.body.quantityUnit || "quintal"}`,
      data: { offerId: offer._id, cropListingId: req.body.cropListing, offerPrice, quantity },
      priority: "high",
    }).catch(() => {});

    return res.status(201).json({ success: true, offer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const farmerOffers = async (req, res) => {
  try {
    const offers = await getOffersForFarmer(req.user._id);
    return res.status(200).json({ success: true, offers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const listingOffers = async (req, res) => {
  try {
    const offers = await getOffersForListing(req.params.id);
    return res.status(200).json({ success: true, offers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const farmerRespondOffer = async (req, res) => {
  try {
    const action = sanitize(req.body.action);
    if (!["accept", "reject", "negotiate"].includes(action))
      return res.status(400).json({ success: false, message: "action must be accept, reject, or negotiate." });

    const offer = await respondToOffer(
      req.params.id,
      req.user._id,
      action,
      toNumber(req.body.counterPrice, null),
      sanitize(req.body.counterMessage)
    );

    if (!offer) return res.status(404).json({ success: false, message: "Offer not found or already resolved." });

    const io = getSocketServer();
    const buyerId = offer.buyer?._id?.toString() ?? offer.buyer?.toString();
    const farmerId = req.user._id.toString();
    const cropName = offer.cropListing?.cropName ?? "crop";

    // ── Notify buyer via socket ──────────────────────────────────────
    if (io && buyerId) {
      if (action === "accept") {
        io.to(`user:${buyerId}`).emit("offer_accepted", {
          offerId: offer._id,
          cropListingId: offer.cropListing?._id ?? offer.cropListing,
          offerPrice: offer.offerPrice,
          cropName,
          message: `Your offer of ₹${offer.offerPrice} for ${cropName} was accepted!`,
        });
      } else if (action === "reject") {
        io.to(`user:${buyerId}`).emit("offer_rejected", {
          offerId: offer._id,
          cropListingId: offer.cropListing?._id ?? offer.cropListing,
          cropName,
          message: `Your offer for ${cropName} was rejected by the farmer.`,
        });
      } else if (action === "negotiate") {
        io.to(`user:${buyerId}`).emit("offer_counter", {
          offerId: offer._id,
          cropListingId: offer.cropListing?._id ?? offer.cropListing,
          counterPrice: offer.counterPrice,
          cropName,
          message: `Farmer countered your offer for ${cropName} at ₹${offer.counterPrice}.`,
        });
      }
    }

    // ── Notify farmer's own socket (refresh offers list) ────────────
    if (io) {
      io.to(`user:${farmerId}`).emit("offer_responded", {
        offerId: offer._id,
        action,
        cropName,
      });
    }

    // ── Persist notification for buyer ──────────────────────────────
    if (buyerId && action !== "negotiate") {
      const notifType = action === "accept" ? "offer_accepted" : "offer_rejected";
      const notifTitle = action === "accept"
        ? `Offer Accepted — ${cropName}`
        : `Offer Rejected — ${cropName}`;
      const notifMsg = action === "accept"
        ? `Your offer of ₹${offer.offerPrice}/${offer.quantityUnit} for ${cropName} has been accepted by the farmer.`
        : `Your offer for ${cropName} was rejected. You can make a new offer or browse other listings.`;

      await Notification.create({
        user: buyerId,
        type: notifType,
        title: notifTitle,
        message: notifMsg,
        data: { offerId: offer._id, cropListingId: offer.cropListing?._id ?? offer.cropListing, offerPrice: offer.offerPrice },
        priority: action === "accept" ? "high" : "normal",
      }).catch(() => {}); // non-blocking
    }

    return res.status(200).json({ success: true, offer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ───── Orders ────────────────────────────────────────────────────── */

export const farmerCreateOrder = async (req, res) => {
  try {
    if (!req.body.offerId)
      return res.status(400).json({ success: false, message: "offerId required." });
    const order = await createOrderFromOffer(req.body.offerId, req.user._id);
    return res.status(201).json({ success: true, order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const farmerOrders = async (req, res) => {
  try {
    const orders = await getMyOrders(req.user._id);
    return res.status(200).json({ success: true, orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const farmerUpdateOrder = async (req, res) => {
  try {
    const status = sanitize(req.body.status);
    const order = await updateOrderStatus(req.params.id, req.user._id, status);
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });
    return res.status(200).json({ success: true, order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ───── Analytics & Discovery ─────────────────────────────────────── */

export const farmerSalesAnalytics = async (req, res) => {
  try {
    const analytics = await getSalesAnalytics(req.user._id);
    return res.status(200).json({ success: true, ...analytics });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const farmerDiscoverBuyers = async (req, res) => {
  try {
    const crop = sanitize(req.query.crop || "Wheat");
    const location = sanitize(req.query.location);
    const buyers = await discoverBuyers(crop, location);
    return res.status(200).json({ success: true, buyers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const farmerHarvestInsights = async (req, res) => {
  try {
    const crop = sanitize(req.query.crop || "Wheat");
    const insights = await getHarvestInsights(crop);
    return res.status(200).json({ success: true, ...insights });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const farmerDemandIndicators = async (req, res) => {
  try {
    const indicators = await getDemandIndicators();
    return res.status(200).json({ success: true, indicators });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
