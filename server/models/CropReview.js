import mongoose from "mongoose";

/**
 * CropReview — buyer review on a specific crop listing and its farmer.
 * One review per (buyer, crop) pair enforced via compound unique index.
 */
const cropReviewSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    cropId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropListing",
      required: true,
      index: true
    },
    /* Denormalised for cheap aggregation in farmer-profile pipeline */
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    reviewText: {
      type: String,
      default: "",
      maxlength: 1000,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/* One review per buyer per crop listing */
cropReviewSchema.index({ cropId: 1, buyerId: 1 }, { unique: true });
/* Fast look-up of all reviews for a given farmer */
cropReviewSchema.index({ farmerId: 1, createdAt: -1 });

export default mongoose.models.CropReview ||
  mongoose.model("CropReview", cropReviewSchema);
