/**
 * Cart Service — Business Logic Layer
 * Controllers stay thin; all cart logic lives here.
 * Uses `buyer` field (matches existing MongoDB documents).
 */
import Cart from "../models/Cart.js";
import CropListing from "../models/CropListing.js";
import { getCache, setCache, deleteCache } from "../config/redis.js";
import { toKg, UNIT_MIN_ORDER } from "../validation/cartValidation.js";

/** Convert qty in listingUnit to kg */
const listingToKg = (qty, unit) => toKg(qty, unit ?? "kg");

const CART_TTL = 120; // seconds

const cacheKey = (buyerId) => `cart_${buyerId}`;

/* ── helpers ──────────────────────────────────────────────────── */

/** Format cart into the standard API response shape */
const formatCart = (cart) => {
  if (!cart) {
    return {
      items: [], groupedByFarmer: [],
      subtotal: 0, deliveryCost: 0, serviceFee: 0, tax: 0, grandTotal: 0,
      itemCount: 0,
    };
  }

  const obj = cart.toObject ? cart.toObject({ virtuals: true }) : cart;

  // Group items by farmer for the UI
  const farmerMap = {};
  for (const item of obj.items ?? []) {
    const fid = item.farmerId?.toString() ?? "unknown";
    if (!farmerMap[fid]) {
      farmerMap[fid] = { farmerId: fid, farmerName: item.farmerName, items: [] };
    }
    farmerMap[fid].items.push({
      ...item,
      subtotal: +(item.pricePerKg * item.quantity).toFixed(2),
    });
  }

  const items = (obj.items ?? []).map((i) => ({
    ...i,
    subtotal: +(i.pricePerKg * i.quantity).toFixed(2),
  }));

  return {
    items,
    groupedByFarmer: Object.values(farmerMap),
    subtotal:     obj.subtotal     ?? 0,
    deliveryCost: obj.deliveryCost ?? 0,
    serviceFee:   obj.serviceFee   ?? 0,
    tax:          obj.tax          ?? 0,
    grandTotal:   obj.grandTotal   ?? 0,
    itemCount:    items.length,
    expiresAt:    obj.expiresAt,
    updatedAt:    obj.updatedAt,
  };
};

/* ── Service methods ──────────────────────────────────────────── */

/**
 * GET cart — Redis-first, then MongoDB
 */
export const getCartService = async (buyerId) => {
  const key = cacheKey(buyerId);

  const cached = await getCache(key);
  if (cached) return cached;

  const cart = await Cart.findOne({ buyer: buyerId });
  const formatted = formatCart(cart);

  await setCache(key, formatted, CART_TTL);
  return formatted;
};

/**
 * ADD item — unit-aware stock validation, builds snapshot, invalidates cache
 * Rules:
 *  1. qty >= 1
 *  2. qty >= UNIT_MIN_ORDER[unit]  (kg:10, quintal:1, ton:1)
 *  3. qty is integer
 *  4. unit must match listing.quantityUnit
 *  5. qty (in kg) <= listing.quantity (in kg)
 */
export const addItemService = async (buyerId, { cropId, quantity }) => {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw Object.assign(new Error("Quantity must be a whole number of at least 1"), { status: 400 });
  }

  // Validate listing
  const listing = await CropListing.findById(cropId).populate("farmer", "name");
  if (!listing) throw Object.assign(new Error("Crop listing not found"), { status: 404 });
  if (listing.status !== "active") {
    throw Object.assign(new Error("This crop is no longer available"), { status: 400 });
  }

  const unit = listing.quantityUnit ?? "kg";

  // Unit-aware minimum order check
  const minOrder = UNIT_MIN_ORDER[unit] ?? 1;
  if (qty < minOrder) {
    throw Object.assign(
      new Error(`Minimum order for ${unit} is ${minOrder} ${unit}`),
      { status: 400 }
    );
  }

  // Convert both to kg for stock comparison
  const requestedKg  = listingToKg(qty, unit);
  const availableKg  = listingToKg(listing.quantity, unit);
  if (requestedKg > availableKg) {
    throw Object.assign(
      new Error(`Only ${listing.quantity} ${unit} available`),
      { status: 400 }
    );
  }

  // Use upsert to safely create-or-fetch the cart — avoids duplicate key on concurrent inserts
  let cart = await Cart.findOneAndUpdate(
    { buyer: buyerId },
    { $setOnInsert: { buyer: buyerId, items: [] } },
    { upsert: true, returnDocument: "after", new: true }
  );

  const existingIdx = cart.items.findIndex((i) => i.crop.toString() === cropId.toString());

  if (existingIdx > -1) {
    const newQty = cart.items[existingIdx].quantity + qty;
    if (newQty > listing.quantity) {
      throw Object.assign(
        new Error(`Cannot add more than ${listing.quantity} ${listing.quantityUnit ?? "kg"}`),
        { status: 400 }
      );
    }
    cart.items[existingIdx].quantity = newQty;
  } else {
    const farmerId = listing.farmer?._id ?? listing.farmer;
    const farmerName = listing.farmer?.name ?? "Farmer";

    cart.items.push({
      crop:           listing._id,
      cropName:       listing.cropName,
      cropImage:      listing.image || "",
      farmerId,
      farmerName,
      pricePerKg:     listing.price,
      availableStock: listing.quantity,
      unit:           listing.quantityUnit ?? "kg",
      quantity:       qty,
    });
  }

  await cart.save();
  await deleteCache(cacheKey(buyerId));
  return formatCart(cart);
};

/**
 * UPDATE quantity — unit-aware stock validation, invalidates cache
 */
export const updateItemService = async (buyerId, cropId, quantity) => {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw Object.assign(new Error("Quantity must be a whole number of at least 1"), { status: 400 });
  }

  const cart = await Cart.findOne({ buyer: buyerId });
  if (!cart) throw Object.assign(new Error("Cart not found"), { status: 404 });

  const idx = cart.items.findIndex((i) => i.crop.toString() === cropId.toString());
  if (idx === -1) throw Object.assign(new Error("Item not in cart"), { status: 404 });

  // Live stock check
  const listing = await CropListing.findById(cropId).select("quantity quantityUnit status");
  if (!listing || listing.status !== "active") {
    throw Object.assign(new Error("Crop is no longer available"), { status: 400 });
  }

  const unit = listing.quantityUnit ?? "kg";

  // Unit-aware minimum order check
  const minOrder = UNIT_MIN_ORDER[unit] ?? 1;
  if (qty < minOrder) {
    throw Object.assign(
      new Error(`Minimum order for ${unit} is ${minOrder} ${unit}`),
      { status: 400 }
    );
  }

  // Convert to kg for stock comparison
  const requestedKg = listingToKg(qty, unit);
  const availableKg = listingToKg(listing.quantity, unit);
  if (requestedKg > availableKg) {
    throw Object.assign(new Error(`Only ${listing.quantity} ${unit} available`), { status: 400 });
  }

  cart.items[idx].quantity = qty;
  await cart.save();
  await deleteCache(cacheKey(buyerId));
  return formatCart(cart);
};

/**
 * REMOVE single item — invalidates cache
 */
export const removeItemService = async (buyerId, cropId) => {
  const cart = await Cart.findOne({ buyer: buyerId });
  if (!cart) throw Object.assign(new Error("Cart not found"), { status: 404 });

  cart.items = cart.items.filter((i) => i.crop.toString() !== cropId.toString());
  await cart.save();
  await deleteCache(cacheKey(buyerId));
  return formatCart(cart);
};

/**
 * CLEAR entire cart — invalidates cache
 */
export const clearCartService = async (buyerId) => {
  await Cart.findOneAndUpdate(
    { buyer: buyerId },
    { $set: { items: [], subtotal: 0, deliveryCost: 0, serviceFee: 0, tax: 0, grandTotal: 0 } },
    { new: true }
  );
  await deleteCache(cacheKey(buyerId));
  return { items: [], groupedByFarmer: [], subtotal: 0, deliveryCost: 0, serviceFee: 0, tax: 0, grandTotal: 0, itemCount: 0 };
};
