import mongoose from "mongoose";

/**
 * MarketplaceCrop
 * Schema aligned with buyer marketplace requirements.
 */
const marketplaceCropSchema = new mongoose.Schema(
  {
    cropName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true
    },
    pricePerKg: {
      type: Number,
      required: true,
      min: 0,
      index: true
    },
    quantityAvailable: {
      type: Number,
      required: true,
      min: 0
    },
    harvestDate: {
      type: Date,
      required: true,
      index: true
    },
    moistureLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    qualityGrade: {
      type: String,
      enum: ["A", "B", "C"],
      default: "B"
    },
    organicCertified: {
      type: Boolean,
      default: false,
      index: true
    },
    images: {
      type: [String],
      default: []
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    location: {
      city: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
        index: true
      },
      state: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
        index: true
      },
      pincode: {
        type: String,
        trim: true,
        maxlength: 12,
        default: ""
      },
      coordinates: {
        type: [Number],
        default: undefined
      }
    }
  },
  {
    timestamps: true
  }
);

marketplaceCropSchema.index({ category: 1, createdAt: -1 });
marketplaceCropSchema.index({ "location.state": 1, pricePerKg: 1 });

export default mongoose.models.MarketplaceCrop ||
  mongoose.model("MarketplaceCrop", marketplaceCropSchema);
