import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    crop:       { type: mongoose.Schema.Types.ObjectId, ref: "CropListing", required: true },
    cropName:   { type: String, required: true },
    cropImage:  { type: String, default: "" },
    quantity:   { type: Number, required: true, min: 1 },
    unit:       { type: String, default: "kg" },
    pricePerKg: { type: Number, required: true, min: 0 },
    subtotal:   { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      index: true,
      // Generated in pre-save: AV-<timestamp>-<random>
    },

    buyer:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Parent order groups all sub-orders from one checkout session
    parentOrderId: { type: String, default: null, index: true },

    items: [orderItemSchema],

    // Pricing
    subtotal:    { type: Number, required: true, min: 0 },
    deliveryCost:{ type: Number, default: 0 },
    serviceFee:  { type: Number, default: 0 },
    tax:         { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    // Delivery
    deliveryType:    { type: String, enum: ["standard", "express"], default: "standard" },
    deliveryAddress: {
      fullName:   String,
      phone:      String,
      street:     String,
      city:       String,
      state:      String,
      postalCode: String,
    },
    estimatedDelivery: { type: Date },

    // Payment
    paymentStatus: {
      type: String,
      enum: ["pending_payment", "paid", "refunded", "failed"],
      default: "pending_payment",
      index: true,
    },
    paymentMethod: { type: String, enum: ["razorpay", "stripe", "wallet"], default: "razorpay" },
    paymentId:     { type: String, default: null },

    // Order lifecycle
    orderStatus: {
      type: String,
      enum: ["pending_payment", "paid", "processing", "shipped", "delivered", "completed", "cancelled"],
      default: "pending_payment",
      index: true,
    },

    // Escrow — farmer paid only when completed
    escrowReleased: { type: Boolean, default: false },
    escrowReleasedAt: { type: Date, default: null },

    cancelReason: { type: String, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Auto-generate orderId before save
orderSchema.pre("save", function () {
  if (!this.orderId) {
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.orderId = `AV-${Date.now()}-${rand}`;
  }
});

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ farmer: 1, createdAt: -1 });

export default mongoose.models.Order || mongoose.model("Order", orderSchema);
