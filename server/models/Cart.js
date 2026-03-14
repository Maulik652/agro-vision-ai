import mongoose from "mongoose";

/**
 * Buyer cart supports items from multiple farmers.
 * Each buyer has one active cart document for fast add/update operations.
 */
const cartItemSchema = new mongoose.Schema(
  {
    cropId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    sourceModel: {
      type: String,
      enum: ["CropListing", "MarketplaceCrop"],
      default: "CropListing"
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    cropName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    image: {
      type: String,
      default: ""
    },
    pricePerKg: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.1
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300
    }
  },
  {
    _id: false
  }
);

const cartSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    items: {
      type: [cartItemSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

cartSchema.index({ buyerId: 1, updatedAt: -1 });

export default mongoose.models.Cart || mongoose.model("Cart", cartSchema);
