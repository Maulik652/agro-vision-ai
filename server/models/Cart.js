/**
 * Cart Model — Production Grade
 * Supports multi-farmer cart with price snapshot, delivery cost,
 * platform fee, tax, and grand total computation.
 */
import mongoose from "mongoose";

/* ── Cart Item Snapshot ─────────────────────────────────────────── */
const cartItemSchema = new mongoose.Schema(
  {
    // Reference to the live listing (for stock checks)
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropListing",
      required: true,
    },
    // Snapshot fields — frozen at add-time to prevent price drift
    cropName:     { type: String, required: true },
    cropImage:    { type: String, default: "" },
    farmerId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    farmerName:   { type: String, required: true },
    pricePerKg:   { type: Number, required: true, min: 0 },
    availableStock: { type: Number, required: true, min: 0 },
    unit:         { type: String, default: "kg" },
    quantity:     { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

/* Virtual: line-item subtotal */
cartItemSchema.virtual("subtotal").get(function () {
  return +(this.pricePerKg * this.quantity).toFixed(2);
});

/* ── Cart Schema ────────────────────────────────────────────────── */
const cartSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: [cartItemSchema],

    // Pricing breakdown (recalculated on every mutation)
    subtotal:       { type: Number, default: 0 },
    deliveryCost:   { type: Number, default: 0 },
    serviceFee:     { type: Number, default: 0 },
    tax:            { type: Number, default: 0 },
    grandTotal:     { type: Number, default: 0 },

    // Buyer location for delivery estimation
    buyerLocation: {
      city:  { type: String, default: "" },
      state: { type: String, default: "" },
    },

    // Cart TTL — expires 7 days after last update
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ── Pricing constants ──────────────────────────────────────────── */
export const PLATFORM_FEE_RATE = 0.015;  // 1.5 %
export const TAX_RATE          = 0.05;   // 5 %
export const BASE_DELIVERY     = 50;     // ₹ per farmer
export const DELIVERY_PER_KG   = 2;     // ₹ per kg

/**
 * Recalculate all pricing fields before every save.
 * Delivery cost = BASE_DELIVERY per unique farmer + DELIVERY_PER_KG × total weight
 */
cartSchema.pre("save", function () {
  const items = this.items ?? [];

  // Subtotal
  const subtotal = items.reduce(
    (sum, i) => sum + i.pricePerKg * i.quantity,
    0
  );

  // Delivery: base per farmer + weight-based
  const uniqueFarmers = new Set(items.map((i) => i.farmerId?.toString())).size;
  const totalWeight   = items.reduce((sum, i) => sum + i.quantity, 0);
  const deliveryCost  = uniqueFarmers > 0
    ? uniqueFarmers * BASE_DELIVERY + totalWeight * DELIVERY_PER_KG
    : 0;

  const serviceFee = +(subtotal * PLATFORM_FEE_RATE).toFixed(2);
  const tax        = +((subtotal + deliveryCost + serviceFee) * TAX_RATE).toFixed(2);
  const grandTotal = +(subtotal + deliveryCost + serviceFee + tax).toFixed(2);

  this.subtotal     = +subtotal.toFixed(2);
  this.deliveryCost = +deliveryCost.toFixed(2);
  this.serviceFee   = serviceFee;
  this.tax          = tax;
  this.grandTotal   = grandTotal;

  // Refresh TTL on every mutation
  this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
});

export default mongoose.models.Cart || mongoose.model("Cart", cartSchema);
