import mongoose from "mongoose";

const marketPriceSchema = new mongoose.Schema(
  {
    cropName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },
    market: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },
    state: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Gujarat"
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      default: "qtl",
      trim: true,
      maxlength: 20
    },
    demandLevel: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium"
    },
    priceChange: {
      type: Number,
      default: 0
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

marketPriceSchema.index({ cropName: 1, market: 1, timestamp: -1 });

export default mongoose.model("MarketPrice", marketPriceSchema);
