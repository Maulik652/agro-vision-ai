import mongoose from "mongoose";

const marketTrendSchema = new mongoose.Schema(
  {
    cropName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },
    location: {
      city: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
        index: true
      },
      state: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
      }
    },
    pricePerKg: {
      type: Number,
      required: true,
      min: 0
    },
    demandScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    volume: {
      type: Number,
      default: 0,
      min: 0
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

marketTrendSchema.index({ cropName: 1, "location.city": 1, date: 1 });

export default mongoose.models.MarketTrend || mongoose.model("MarketTrend", marketTrendSchema);
