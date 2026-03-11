import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, required: true },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    buyerName: { type: String, default: "" },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cropListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropListing",
      required: true,
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BuyerOffer",
      default: null,
    },
    cropName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    quantityUnit: {
      type: String,
      enum: ["kg", "quintal", "ton"],
      default: "quintal",
    },
    pricePerUnit: { type: Number, required: true, min: 0.01 },
    totalAmount: { type: Number, required: true, min: 0.01 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    deliveryAddress: { type: String, default: "" },
    deliveryDate: { type: Date, default: null },
    notes: { type: String, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

orderSchema.index({ farmer: 1, status: 1, createdAt: -1 });
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ orderId: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
