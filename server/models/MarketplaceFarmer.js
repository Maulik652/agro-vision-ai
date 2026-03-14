import mongoose from "mongoose";

/**
 * MarketplaceFarmer
 * Dedicated farmer profile model for marketplace-focused features.
 */
const marketplaceFarmerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    farmLocation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      index: true
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 4.5,
      index: true
    },
    certifications: {
      type: [String],
      default: []
    },
    totalSales: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.MarketplaceFarmer ||
  mongoose.model("MarketplaceFarmer", marketplaceFarmerSchema);
