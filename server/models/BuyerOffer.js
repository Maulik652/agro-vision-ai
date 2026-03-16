import mongoose from "mongoose";

const buyerOfferSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    buyerName: { type: String, default: "" },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    cropListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropListing",
      required: true,
      index: true,
    },
    offerPrice: { type: Number, required: true, min: 0.01 },
    quantity: { type: Number, required: true, min: 1 },
    quantityUnit: {
      type: String,
      enum: ["kg", "quintal", "ton"],
      default: "quintal",
    },
    message: { type: String, default: "", maxlength: 500, trim: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "negotiating", "expired"],
      default: "pending",
      index: true,
    },
    counterPrice: { type: Number, default: null },
    counterMessage: { type: String, default: "", maxlength: 500, trim: true },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h TTL
    },
  },
  { timestamps: true }
);

buyerOfferSchema.index({ farmer: 1, status: 1, createdAt: -1 });
buyerOfferSchema.index({ buyer: 1, createdAt: -1 });

export default mongoose.models.BuyerOffer ||
  mongoose.model("BuyerOffer", buyerOfferSchema);
