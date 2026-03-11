import mongoose from "mongoose";

const buyerOfferSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    buyerName: { type: String, default: "" },
    cropListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropListing",
      required: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    offerPrice: { type: Number, required: true, min: 0.01 },
    quantity: { type: Number, required: true, min: 1 },
    quantityUnit: {
      type: String,
      enum: ["kg", "quintal", "ton"],
      default: "quintal",
    },
    message: { type: String, maxlength: 500, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "negotiating", "expired"],
      default: "pending",
    },
    counterPrice: { type: Number, default: null },
    counterMessage: { type: String, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

buyerOfferSchema.index({ cropListing: 1, status: 1 });
buyerOfferSchema.index({ farmer: 1, status: 1, createdAt: -1 });
buyerOfferSchema.index({ buyer: 1, createdAt: -1 });

const BuyerOffer = mongoose.model("BuyerOffer", buyerOfferSchema);
export default BuyerOffer;
