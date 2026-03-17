import mongoose from "mongoose";

const marketInsightSchema = new mongoose.Schema(
  {
    crop:        { type: String, required: true, trim: true },
    region:      { type: String, default: "national" },
    priceTrend:  { type: String, enum: ["rising", "falling", "stable"], default: "stable" },
    currentPrice:{ type: Number, default: 0 },
    priceChange: { type: Number, default: 0 },   // % change
    demandLevel: { type: String, enum: ["low", "medium", "high", "very_high"], default: "medium" },
    supplyLevel: { type: String, enum: ["low", "medium", "high", "surplus"], default: "medium" },
    forecast:    { type: String, maxlength: 500, default: "" },
    priceHistory:[{ date: String, price: Number }],
    updatedAt:   { type: Date, default: Date.now }
  },
  { timestamps: true }
);

marketInsightSchema.index({ crop: 1, region: 1 });

export default mongoose.model("MarketInsight", marketInsightSchema);
