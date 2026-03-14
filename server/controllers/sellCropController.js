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

const sanitize = (v) => String(v || "").trim().slice(0, 200);
const toNumber = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

/* ───── Farmer Listings ───────────────────────────────────────────── */

export const farmerMyListings = async (req, res) => {
  try {
    const listings = await getMyListings(req.user._id);
    return res.status(200).json({ success: true, listings });
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
