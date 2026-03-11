import mongoose from "mongoose";

const cropPriceHistorySchema = new mongoose.Schema(
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
      trim: true,
      maxlength: 100,
      default: "All"
    },
    date: {
      type: Date,
      required: true,
      index: true
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
    }
  },
  { timestamps: true }
);

cropPriceHistorySchema.index({ cropName: 1, date: -1 });

export default mongoose.model("CropPriceHistory", cropPriceHistorySchema);
