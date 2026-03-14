import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import BuyerProfile from "../models/BuyerProfile.js";
import CropListing from "../models/CropListing.js";
import MarketplaceCrop from "../models/MarketplaceCrop.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { deleteCache, getCache, setCache } from "../config/redis.js";

const CART_CACHE_TTL_SECONDS = 120;
const SERVICE_FEE_RATE = 0.015;
const TAX_RATE = 0.05;
const quantityUnitToKg = {
  kg: 1,
  quintal: 100,
  ton: 1000
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Number(toNumber(value, 0).toFixed(2));

const normalizeText = (value) => String(value || "").trim();

const toObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
};

const locationLabel = (location = {}) =>
  [normalizeText(location.city), normalizeText(location.state)].filter(Boolean).join(", ");

const toKg = (quantity, unit = "kg") => {
  const normalizedUnit = normalizeText(unit).toLowerCase() || "kg";
  const factor = quantityUnitToKg[normalizedUnit] || 1;
  return toNumber(quantity, 0) * factor;
};

const safeCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const [longitude, latitude] = coordinates;
  const safeLongitude = Number(longitude);
  const safeLatitude = Number(latitude);

  if (!Number.isFinite(safeLongitude) || !Number.isFinite(safeLatitude)) {
    return null;
  }

  return {
    longitude: safeLongitude,
    latitude: safeLatitude
  };
};

const haversineDistanceKm = (origin, destination) => {
  const earthRadiusKm = 6371;

  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const startLatitude = toRadians(origin.latitude);
  const endLatitude = toRadians(destination.latitude);

  const a = (Math.sin(latitudeDelta / 2) ** 2)
    + (Math.cos(startLatitude) * Math.cos(endLatitude) * (Math.sin(longitudeDelta / 2) ** 2));

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
};

const estimateDistanceKm = (buyerLocation = {}, farmerLocation = {}) => {
  const buyerCoordinates = safeCoordinates(buyerLocation.coordinates);
  const farmerCoordinates = safeCoordinates(farmerLocation.coordinates);

  if (buyerCoordinates && farmerCoordinates) {
    return Math.max(5, haversineDistanceKm(buyerCoordinates, farmerCoordinates));
  }

  const buyerCity = normalizeText(buyerLocation.city).toLowerCase();
  const buyerState = normalizeText(buyerLocation.state).toLowerCase();
  const farmerCity = normalizeText(farmerLocation.city).toLowerCase();
  const farmerState = normalizeText(farmerLocation.state).toLowerCase();

  if (buyerCity && farmerCity && buyerState && farmerState && buyerCity === farmerCity && buyerState === farmerState) {
    return 24;
  }

  if (buyerState && farmerState && buyerState === farmerState) {
    return 180;
  }

  if (!buyerState || !farmerState) {
    return 260;
  }

  return 520;
};

const estimateGroupDelivery = ({ buyerLocation, farmerLocation, totalWeightKg }) => {
  if (totalWeightKg <= 0) {
    return {
      distanceKm: 0,
      etaHours: 0,
      cost: 0,
      laneType: "not-applicable"
    };
  }

  const distanceKm = estimateDistanceKm(buyerLocation, farmerLocation);
  const sameState = normalizeText(buyerLocation.state).toLowerCase()
    && normalizeText(buyerLocation.state).toLowerCase() === normalizeText(farmerLocation.state).toLowerCase();
  const sameCity = sameState
    && normalizeText(buyerLocation.city).toLowerCase()
      === normalizeText(farmerLocation.city).toLowerCase();

  const baseCharge = sameCity ? 80 : sameState ? 150 : 260;
  const perKmRate = sameCity ? 1.2 : sameState ? 1.7 : 2.05;
  const weightRate = totalWeightKg <= 100 ? 0.9 : totalWeightKg <= 500 ? 0.68 : 0.54;
  const cost = baseCharge + (distanceKm * perKmRate) + (totalWeightKg * weightRate);
  const etaHours = Math.max(4, (distanceKm / 42) + (totalWeightKg / 280));

  return {
    distanceKm: Number(distanceKm.toFixed(1)),
    etaHours: Number(etaHours.toFixed(1)),
    cost: roundMoney(cost),
    laneType: sameCity ? "intra-city" : sameState ? "regional" : "inter-state"
  };
};

const cartCacheKey = (buyerId) => `cart_${buyerId}`;

const normalizeCartItems = (items = []) =>
  items.map((item) => ({
    cropId: String(item.cropId),
    sourceModel: String(item.sourceModel || "CropListing"),
    farmerId: String(item.farmerId),
    cropName: item.cropName,
    image: item.image || "",
    pricePerKg: roundMoney(item.pricePerKg),
    quantity: Number(toNumber(item.quantity, 0).toFixed(2)),
    note: item.note || ""
  }));

const buildUnavailableItem = (item) => ({
  cartItemKey: `${String(item.cropId)}::${String(item.farmerId)}`,
  cropId: String(item.cropId),
  farmerId: String(item.farmerId),
  sourceModel: String(item.sourceModel || "CropListing"),
  cropName: item.cropName || "Unavailable Crop",
  cropCategory: "Unavailable",
  image: item.image || "",
  farmerName: "Unavailable Farmer",
  farmerLocation: {
    city: "",
    state: "",
    label: "Unavailable"
  },
  cropLocation: {
    city: "",
    state: "",
    label: "Unavailable"
  },
  pricePerKg: roundMoney(item.pricePerKg),
  quantity: Number(toNumber(item.quantity, 0).toFixed(2)),
  availableStockKg: 0,
  totalPrice: roundMoney(toNumber(item.quantity, 0) * toNumber(item.pricePerKg, 0)),
  qualityGrade: "N/A",
  organicCertified: false,
  isAvailable: false,
  stockStatus: "unavailable",
  validationMessage: "This listing is no longer available.",
  note: item.note || ""
});

const readCropListing = async (cropId, session = null, includeInactive = false) => {
  const objectId = toObjectId(cropId);
  if (!objectId) {
    return null;
  }

  let query = CropListing.findById(objectId).populate("farmer", "name city state");
  if (session) {
    query = query.session(session);
  }

  const listing = await query.lean();
  if (!listing) {
    return null;
  }

  const isActive = Boolean(listing.isActive) && String(listing.status || "").toLowerCase() === "active";
  if (!includeInactive && !isActive) {
    return null;
  }

  return {
    cropId: String(listing._id),
    sourceModel: "CropListing",
    farmerId: String(listing.farmer?._id || listing.farmer || ""),
    farmerName: listing.farmer?.name || "Farmer",
    cropName: listing.cropName,
    cropCategory: listing.category || listing.cropName || "General",
    image: listing.image || "",
    pricePerKg: roundMoney(listing.price),
    availableStockKg: Number(toKg(listing.quantity, listing.quantityUnit).toFixed(2)),
    qualityGrade: listing.grade || "B",
    organicCertified: String(listing.qualityType || "").toLowerCase() === "organic",
    cropLocation: {
      city: listing.location?.city || listing.farmer?.city || "",
      state: listing.location?.state || listing.farmer?.state || "",
      coordinates: Array.isArray(listing.location?.coordinates) ? listing.location.coordinates : undefined,
      label: locationLabel(listing.location || listing.farmer || {})
    },
    farmerLocation: {
      city: listing.farmer?.city || listing.location?.city || "",
      state: listing.farmer?.state || listing.location?.state || "",
      label: locationLabel(listing.farmer || listing.location || {})
    },
    isSourceActive: isActive
  };
};

const readMarketplaceCrop = async (cropId, session = null) => {
  const objectId = toObjectId(cropId);
  if (!objectId) {
    return null;
  }

  let query = MarketplaceCrop.findById(objectId);
  if (session) {
    query = query.session(session);
  }

  const crop = await query.lean();
  if (!crop) {
    return null;
  }

  const farmerObjectId = toObjectId(crop.farmerId);
  let farmer = null;

  if (farmerObjectId) {
    let farmerQuery = User.findById(farmerObjectId).select("name city state");
    if (session) {
      farmerQuery = farmerQuery.session(session);
    }
    farmer = await farmerQuery.lean();
  }

  return {
    cropId: String(crop._id),
    sourceModel: "MarketplaceCrop",
    farmerId: String(crop.farmerId || ""),
    farmerName: farmer?.name || "Farmer",
    cropName: crop.cropName,
    cropCategory: crop.category || crop.cropName || "General",
    image: Array.isArray(crop.images) && crop.images.length ? crop.images[0] : "",
    pricePerKg: roundMoney(crop.pricePerKg),
    availableStockKg: Number(toNumber(crop.quantityAvailable, 0).toFixed(2)),
    qualityGrade: crop.qualityGrade || "B",
    organicCertified: Boolean(crop.organicCertified),
    cropLocation: {
      city: crop.location?.city || farmer?.city || "",
      state: crop.location?.state || farmer?.state || "",
      coordinates: Array.isArray(crop.location?.coordinates) ? crop.location.coordinates : undefined,
      label: locationLabel(crop.location || farmer || {})
    },
    farmerLocation: {
      city: farmer?.city || crop.location?.city || "",
      state: farmer?.state || crop.location?.state || "",
      label: locationLabel(farmer || crop.location || {})
    },
    isSourceActive: true
  };
};

const resolveCropForWrite = async (cropId, preferredSourceModel = "", session = null) => {
  if (preferredSourceModel === "MarketplaceCrop") {
    return readMarketplaceCrop(cropId, session);
  }

  if (preferredSourceModel === "CropListing") {
    return readCropListing(cropId, session, false);
  }

  const [listing, marketplaceCrop] = await Promise.all([
    readCropListing(cropId, session, false),
    readMarketplaceCrop(cropId, session)
  ]);

  return listing || marketplaceCrop || null;
};

const resolveCropForSnapshot = async (item) => {
  const preferredSource = String(item.sourceModel || "");

  if (preferredSource === "MarketplaceCrop") {
    return (await readMarketplaceCrop(item.cropId)) || buildUnavailableItem(item);
  }

  if (preferredSource === "CropListing") {
    return (await readCropListing(item.cropId, null, true)) || buildUnavailableItem(item);
  }

  const [listing, marketplaceCrop] = await Promise.all([
    readCropListing(item.cropId, null, true),
    readMarketplaceCrop(item.cropId)
  ]);

  return listing || marketplaceCrop || buildUnavailableItem(item);
};

const buildBuyerContext = async (buyerId, reqUser, overrides = {}) => {
  const [profile, recentOrders] = await Promise.all([
    BuyerProfile.findOne({ user: buyerId }).lean(),
    Order.find({ buyer: buyerId })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("cropName")
      .lean()
  ]);

  const buyerCity = normalizeText(overrides.buyerCity || profile?.location?.city || reqUser?.city);
  const buyerState = normalizeText(overrides.buyerState || profile?.location?.state || reqUser?.state);
  const source = overrides.buyerCity || overrides.buyerState
    ? "query"
    : profile?.location?.city || profile?.location?.state
      ? "buyer-profile"
      : "user-profile";

  return {
    buyerLocation: {
      city: buyerCity,
      state: buyerState,
      label: [buyerCity, buyerState].filter(Boolean).join(", "),
      source
    },
    buyerProfile: profile,
    purchaseHistory: recentOrders.map((row) => normalizeText(row.cropName)).filter(Boolean)
  };
};

const hydrateCartItems = async (cartItems = []) => {
  const hydrated = await Promise.all(
    cartItems.map(async (item) => {
      const resolved = await resolveCropForSnapshot(item);
      if (!resolved || resolved.stockStatus === "unavailable") {
        return buildUnavailableItem(item);
      }

      const availableStockKg = Number(toNumber(resolved.availableStockKg, 0).toFixed(2));
      const quantity = Number(toNumber(item.quantity, 0).toFixed(2));
      const stockStatus = !resolved.isSourceActive
        ? "unavailable"
        : availableStockKg <= 0
          ? "out_of_stock"
          : quantity > availableStockKg
            ? "insufficient_stock"
            : "ok";

      const validationMessage = stockStatus === "unavailable"
        ? "This listing is no longer active."
        : stockStatus === "out_of_stock"
          ? "This crop is currently out of stock."
          : stockStatus === "insufficient_stock"
            ? `Only ${availableStockKg.toLocaleString("en-IN")} kg are available right now.`
            : "";

      return {
        cartItemKey: `${String(item.cropId)}::${String(item.farmerId)}`,
        cropId: String(item.cropId),
        farmerId: String(item.farmerId),
        sourceModel: String(resolved.sourceModel || item.sourceModel || "CropListing"),
        cropName: resolved.cropName || item.cropName || "Crop",
        cropCategory: resolved.cropCategory || resolved.cropName || "General",
        image: resolved.image || item.image || "",
        farmerName: resolved.farmerName || "Farmer",
        farmerLocation: {
          ...resolved.farmerLocation,
          label: resolved.farmerLocation?.label || locationLabel(resolved.farmerLocation || {})
        },
        cropLocation: {
          ...resolved.cropLocation,
          label: resolved.cropLocation?.label || locationLabel(resolved.cropLocation || {})
        },
        pricePerKg: roundMoney(resolved.pricePerKg ?? item.pricePerKg),
        quantity,
        availableStockKg,
        totalPrice: roundMoney(quantity * toNumber(resolved.pricePerKg ?? item.pricePerKg, 0)),
        qualityGrade: resolved.qualityGrade || "B",
        organicCertified: Boolean(resolved.organicCertified),
        isAvailable: stockStatus === "ok",
        stockStatus,
        validationMessage,
        note: item.note || ""
      };
    })
  );

  return hydrated;
};

const buildRecommendations = async ({
  buyerLocation,
  buyerInterests = [],
  purchaseHistory = [],
  cartItems = [],
  limit = 8
}) => {
  const cartCropIds = new Set(cartItems.map((item) => String(item.cropId)));
  const cropSignals = [
    ...buyerInterests,
    ...purchaseHistory,
    ...cartItems.map((item) => item.cropCategory),
    ...cartItems.map((item) => item.cropName)
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  const uniqueSignals = [...new Set(cropSignals)].slice(0, 8);
  const signalRegex = uniqueSignals.length
    ? new RegExp(uniqueSignals.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i")
    : null;

  const [listingRows, marketplaceRows] = await Promise.all([
    CropListing.find({
      isActive: true,
      status: "active",
      ...(signalRegex ? { $or: [{ cropName: signalRegex }, { tags: signalRegex }] } : {})
    })
      .sort({ createdAt: -1 })
      .limit(18)
      .populate("farmer", "name city state")
      .lean(),
    MarketplaceCrop.find(signalRegex ? { $or: [{ cropName: signalRegex }, { category: signalRegex }] } : {})
      .sort({ createdAt: -1 })
      .limit(18)
      .lean()
  ]);

  const marketplaceFarmerIds = [...new Set(marketplaceRows.map((row) => String(row.farmerId)).filter(Boolean))];
  const marketplaceFarmers = marketplaceFarmerIds.length
    ? await User.find({ _id: { $in: marketplaceFarmerIds } }).select("name city state").lean()
    : [];
  const farmerMap = new Map(marketplaceFarmers.map((farmer) => [String(farmer._id), farmer]));

  const normalizedCandidates = [
    ...listingRows.map((row) => ({
      cropId: String(row._id),
      farmerId: String(row.farmer?._id || row.farmer || ""),
      cropName: row.cropName,
      category: row.category || row.cropName || "General",
      farmerName: row.farmer?.name || "Farmer",
      image: row.image || "",
      pricePerKg: roundMoney(row.price),
      location: {
        city: row.location?.city || row.farmer?.city || "",
        state: row.location?.state || row.farmer?.state || ""
      },
      organicCertified: String(row.qualityType || "").toLowerCase() === "organic",
      qualityGrade: row.grade || "B",
      sourceModel: "CropListing"
    })),
    ...marketplaceRows.map((row) => {
      const farmer = farmerMap.get(String(row.farmerId));

      return {
        cropId: String(row._id),
        farmerId: String(row.farmerId || ""),
        cropName: row.cropName,
        category: row.category || row.cropName || "General",
        farmerName: farmer?.name || "Farmer",
        image: Array.isArray(row.images) && row.images.length ? row.images[0] : "",
        pricePerKg: roundMoney(row.pricePerKg),
        location: {
          city: row.location?.city || farmer?.city || "",
          state: row.location?.state || farmer?.state || ""
        },
        organicCertified: Boolean(row.organicCertified),
        qualityGrade: row.qualityGrade || "B",
        sourceModel: "MarketplaceCrop"
      };
    })
  ]
    .filter((candidate) => candidate.cropId && !cartCropIds.has(candidate.cropId));

  const uniqueRecommendations = new Map();

  for (const candidate of normalizedCandidates) {
    const locationBoost = normalizeText(candidate.location.state).toLowerCase()
      && normalizeText(candidate.location.state).toLowerCase() === normalizeText(buyerLocation.state).toLowerCase()
      ? 0.12
      : 0;
    const directInterest = uniqueSignals.some((signal) => signal.toLowerCase() === normalizeText(candidate.cropName).toLowerCase());
    const categoryInterest = uniqueSignals.some((signal) => signal.toLowerCase() === normalizeText(candidate.category).toLowerCase());
    const organicBoost = candidate.organicCertified ? 0.04 : 0;
    const priceScore = candidate.pricePerKg > 0 ? Math.max(0.08, 0.22 - (candidate.pricePerKg / 500)) : 0.1;
    const aiScore = Math.min(
      0.98,
      0.42
      + (directInterest ? 0.22 : 0)
      + (categoryInterest ? 0.14 : 0)
      + locationBoost
      + organicBoost
      + priceScore
    );

    const reasons = [
      directInterest ? "Buyer interest match" : "AI catalog match",
      categoryInterest ? `Category ${candidate.category}` : null,
      locationBoost ? "Closer delivery lane" : null,
      candidate.organicCertified ? "Organic certified" : null
    ].filter(Boolean);

    uniqueRecommendations.set(`${candidate.cropId}:${candidate.farmerId}`, {
      ...candidate,
      aiScore: Number(aiScore.toFixed(2)),
      reasonTags: reasons.slice(0, 3)
    });
  }

  return [...uniqueRecommendations.values()]
    .sort((left, right) => right.aiScore - left.aiScore)
    .slice(0, limit);
};

const buildCartPayload = async ({ cartDocument, reqUser, overrides = {} }) => {
  const cartItems = Array.isArray(cartDocument?.items) ? cartDocument.items : [];
  const [buyerContext, hydratedItems] = await Promise.all([
    buildBuyerContext(reqUser._id, reqUser, overrides),
    hydrateCartItems(cartItems)
  ]);

  const groupedItemsMap = new Map();

  for (const item of hydratedItems) {
    const farmerKey = String(item.farmerId || "unknown");

    if (!groupedItemsMap.has(farmerKey)) {
      groupedItemsMap.set(farmerKey, {
        farmerId: farmerKey,
        farmerName: item.farmerName || "Farmer",
        farmerLocation: item.farmerLocation,
        items: [],
        subtotal: 0,
        totalWeightKg: 0,
        deliveryEstimate: {
          distanceKm: 0,
          etaHours: 0,
          cost: 0,
          laneType: "not-applicable"
        }
      });
    }

    const group = groupedItemsMap.get(farmerKey);
    group.items.push(item);
    group.subtotal = roundMoney(group.subtotal + item.totalPrice);
    group.totalWeightKg = Number((group.totalWeightKg + item.quantity).toFixed(2));
  }

  const groups = [...groupedItemsMap.values()].map((group) => {
    const deliveryEstimate = estimateGroupDelivery({
      buyerLocation: buyerContext.buyerLocation,
      farmerLocation: group.farmerLocation,
      totalWeightKg: group.totalWeightKg
    });

    return {
      ...group,
      deliveryEstimate
    };
  });

  const subtotal = roundMoney(hydratedItems.reduce((sum, item) => sum + item.totalPrice, 0));
  const deliveryCost = roundMoney(groups.reduce((sum, group) => sum + toNumber(group.deliveryEstimate.cost, 0), 0));
  const serviceFee = subtotal > 0 ? roundMoney(Math.max(35, subtotal * SERVICE_FEE_RATE)) : 0;
  const tax = subtotal > 0 ? roundMoney((subtotal + serviceFee) * TAX_RATE) : 0;
  const grandTotal = roundMoney(subtotal + deliveryCost + serviceFee + tax);
  const totalWeightKg = Number(hydratedItems.reduce((sum, item) => sum + toNumber(item.quantity, 0), 0).toFixed(2));

  const issues = hydratedItems
    .filter((item) => item.stockStatus !== "ok")
    .map((item) => ({
      cropId: item.cropId,
      farmerId: item.farmerId,
      stockStatus: item.stockStatus,
      message: item.validationMessage
    }));

  const recommendations = await buildRecommendations({
    buyerLocation: buyerContext.buyerLocation,
    buyerInterests: buyerContext.buyerProfile?.cropsInterested || [],
    purchaseHistory: buyerContext.purchaseHistory,
    cartItems: hydratedItems,
    limit: 8
  });

  return {
    buyerId: String(reqUser._id),
    buyerLocation: buyerContext.buyerLocation,
    itemCount: hydratedItems.length,
    farmerCount: groups.length,
    totalWeightKg,
    items: hydratedItems,
    groups,
    recommendations,
    subtotal,
    deliveryCost,
    serviceFee,
    tax,
    grandTotal,
    isCheckoutReady: hydratedItems.length > 0 && issues.length === 0,
    issues,
    updatedAt: cartDocument?.updatedAt || null,
    cache: {
      key: cartCacheKey(reqUser._id),
      ttlSeconds: CART_CACHE_TTL_SECONDS
    }
  };
};

const sendCartResponse = async (res, { message = "Cart loaded", cartDocument, reqUser, overrides = {}, buyNow = false } = {}) => {
  const payload = await buildCartPayload({ cartDocument, reqUser, overrides });

  return res.status(200).json({
    success: true,
    message,
    ...payload,
    cart: payload,
    buyNow: Boolean(buyNow)
  });
};

const getCartDocument = async (buyerId, session = null) => {
  let query = Cart.findOne({ buyerId });
  if (session) {
    query = query.session(session);
  }

  return query;
};

const createEmptyCartDocument = (buyerId) => new Cart({
  buyerId,
  items: []
});

const isTransactionUnsupportedError = (error) => /replica set member|Transaction numbers are only allowed/i.test(String(error?.message || ""));

const runCartTransaction = async (operation) => {
  const session = await mongoose.startSession();

  try {
    let result;

    try {
      await session.withTransaction(async () => {
        result = await operation(session);
      });
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) {
        throw error;
      }

      result = await operation(null);
    }

    return result;
  } finally {
    await session.endSession();
  }
};

const assertCropAvailability = ({ crop, farmerId, requestedQuantity }) => {
  if (!crop) {
    const error = new Error("Crop not found");
    error.statusCode = 404;
    throw error;
  }

  if (String(crop.farmerId) !== String(farmerId)) {
    const error = new Error("Crop farmer mismatch");
    error.statusCode = 400;
    throw error;
  }

  if (requestedQuantity > toNumber(crop.availableStockKg, 0)) {
    const error = new Error(`Only ${toNumber(crop.availableStockKg, 0).toLocaleString("en-IN")} kg are available`);
    error.statusCode = 409;
    throw error;
  }
};

const deleteCartCache = async (buyerId) => {
  await deleteCache(cartCacheKey(buyerId));
};

export const getCart = async (req, res) => {
  try {
    const cacheKey = cartCacheKey(req.user._id);
    const overrideCity = normalizeText(req.validatedQuery?.buyerCity);
    const overrideState = normalizeText(req.validatedQuery?.buyerState);
    const hasLocationOverride = Boolean(overrideCity || overrideState);

    if (!hasLocationOverride) {
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          message: "Cart loaded from cache",
          ...cached,
          cart: cached,
          buyNow: false
        });
      }
    }

    const cartDocument = await getCartDocument(req.user._id).lean();
    const payload = await buildCartPayload({
      cartDocument,
      reqUser: req.user,
      overrides: {
        buyerCity: overrideCity,
        buyerState: overrideState
      }
    });

    if (!hasLocationOverride) {
      await setCache(cacheKey, payload, CART_CACHE_TTL_SECONDS);
    }

    return res.status(200).json({
      success: true,
      message: "Cart loaded",
      ...payload,
      cart: payload,
      buyNow: false
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load cart",
      detail: error.message
    });
  }
};

export const addCartItem = async (req, res) => {
  try {
    const { cropId, farmerId, quantity, buyNow = false, note = "" } = req.validatedBody || req.body;
    const safeQuantity = Number(Math.max(0.1, toNumber(quantity, 0.1)).toFixed(2));

    const cartDocument = await runCartTransaction(async (session) => {
      const crop = await resolveCropForWrite(cropId, "", session);
      assertCropAvailability({ crop, farmerId, requestedQuantity: safeQuantity });

      let cart = await getCartDocument(req.user._id, session);
      if (!cart) {
        cart = createEmptyCartDocument(req.user._id);
      }

      const existingIndex = cart.items.findIndex(
        (item) => String(item.cropId) === String(crop.cropId) && String(item.farmerId) === String(farmerId)
      );

      const nextQuantity = existingIndex >= 0
        ? Number((toNumber(cart.items[existingIndex].quantity, 0) + safeQuantity).toFixed(2))
        : safeQuantity;

      assertCropAvailability({ crop, farmerId, requestedQuantity: nextQuantity });

      if (existingIndex >= 0) {
        cart.items[existingIndex].quantity = nextQuantity;
        cart.items[existingIndex].pricePerKg = crop.pricePerKg;
        cart.items[existingIndex].cropName = crop.cropName;
        cart.items[existingIndex].image = crop.image;
        cart.items[existingIndex].sourceModel = crop.sourceModel;
        cart.items[existingIndex].note = normalizeText(note || cart.items[existingIndex].note || "");
      } else {
        cart.items.push({
          cropId: crop.cropId,
          sourceModel: crop.sourceModel,
          farmerId,
          cropName: crop.cropName,
          image: crop.image,
          pricePerKg: crop.pricePerKg,
          quantity: safeQuantity,
          note: normalizeText(note)
        });
      }

      await cart.save(session ? { session } : undefined);
      return cart.toObject();
    });

    await deleteCartCache(req.user._id);

    return sendCartResponse(res, {
      message: buyNow ? "Ready for instant purchase" : "Added to cart",
      cartDocument,
      reqUser: req.user,
      buyNow
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add item to cart",
      detail: error.message
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const {
      cropId,
      farmerId,
      quantity,
      note = "",
      buyerCity = "",
      buyerState = ""
    } = req.validatedBody || req.body;

    const safeQuantity = Number(Math.max(0.1, toNumber(quantity, 0.1)).toFixed(2));

    const cartDocument = await runCartTransaction(async (session) => {
      const crop = await resolveCropForWrite(cropId, "", session);
      assertCropAvailability({ crop, farmerId, requestedQuantity: safeQuantity });

      const cart = await getCartDocument(req.user._id, session);
      if (!cart) {
        const error = new Error("Cart not found");
        error.statusCode = 404;
        throw error;
      }

      const itemIndex = cart.items.findIndex(
        (item) => String(item.cropId) === String(cropId) && String(item.farmerId) === String(farmerId)
      );

      if (itemIndex < 0) {
        const error = new Error("Cart item not found");
        error.statusCode = 404;
        throw error;
      }

      cart.items[itemIndex].quantity = safeQuantity;
      cart.items[itemIndex].pricePerKg = crop.pricePerKg;
      cart.items[itemIndex].cropName = crop.cropName;
      cart.items[itemIndex].image = crop.image;
      cart.items[itemIndex].sourceModel = crop.sourceModel;
      cart.items[itemIndex].note = normalizeText(note || cart.items[itemIndex].note || "");

      await cart.save(session ? { session } : undefined);
      return cart.toObject();
    });

    await deleteCartCache(req.user._id);

    return sendCartResponse(res, {
      message: "Cart quantity updated",
      cartDocument,
      reqUser: req.user,
      overrides: {
        buyerCity,
        buyerState
      }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update cart item",
      detail: error.message
    });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const {
      cropId,
      farmerId,
      buyerCity = "",
      buyerState = ""
    } = req.validatedBody || req.body;

    const cartDocument = await runCartTransaction(async (session) => {
      const cart = await getCartDocument(req.user._id, session);
      if (!cart) {
        const error = new Error("Cart not found");
        error.statusCode = 404;
        throw error;
      }

      const previousCount = cart.items.length;
      cart.items = cart.items.filter(
        (item) => !(String(item.cropId) === String(cropId) && String(item.farmerId) === String(farmerId))
      );

      if (cart.items.length === previousCount) {
        const error = new Error("Cart item not found");
        error.statusCode = 404;
        throw error;
      }

      await cart.save(session ? { session } : undefined);
      return cart.toObject();
    });

    await deleteCartCache(req.user._id);

    return sendCartResponse(res, {
      message: "Item removed from cart",
      cartDocument,
      reqUser: req.user,
      overrides: {
        buyerCity,
        buyerState
      }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to remove cart item",
      detail: error.message
    });
  }
};

export const clearCart = async (req, res) => {
  try {
    const buyerCity = normalizeText(req.validatedQuery?.buyerCity);
    const buyerState = normalizeText(req.validatedQuery?.buyerState);

    const cartDocument = await runCartTransaction(async (session) => {
      let cart = await getCartDocument(req.user._id, session);
      if (!cart) {
        cart = createEmptyCartDocument(req.user._id);
      }

      cart.items = [];
      await cart.save(session ? { session } : undefined);

      return cart.toObject();
    });

    await deleteCartCache(req.user._id);

    return sendCartResponse(res, {
      message: "Cart cleared",
      cartDocument,
      reqUser: req.user,
      overrides: {
        buyerCity,
        buyerState
      }
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to clear cart",
      detail: error.message
    });
  }
};
