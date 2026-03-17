import mongoose from "mongoose";

const cropOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, index: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cropListing: { type: mongoose.Schema.Types.ObjectId, ref: "CropListing" },
    cropName: { type: String, required: true },
    cropImage: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "kg" },
    pricePerUnit: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending_payment", "paid", "refunded", "failed"],
      default: "pending_payment",
    },
    deliveryAddress: {
      fullName: String, phone: String, street: String,
      city: String, state: String, postalCode: String,
    },
    cancelReason: { type: String, default: null },
    fromOffer: { type: mongoose.Schema.Types.ObjectId, ref: "CropOffer", default: null },
  },
  { timestamps: true }
);

cropOrderSchema.pre("save", function () {
  if (!this.orderId) {
    this.orderId = `CO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
});

cropOrderSchema.index({ farmer: 1, status: 1, createdAt: -1 });
cropOrderSchema.index({ buyer: 1, createdAt: -1 });

export default mongoose.models.CropOrder || mongoose.model("CropOrder", cropOrderSchema);
