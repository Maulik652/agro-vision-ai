import mongoose from "mongoose";

const cropListingSchema = new mongoose.Schema(
  {
    cropName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    quantityUnit: {
      type: String,
      enum: ["kg", "quintal", "ton"],
      default: "kg"
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    aiSuggestedPrice: {
      type: Number,
      min: 0,
      default: null
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 100,
      default: null
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
      },
      coordinates: {
        type: [Number],
        default: undefined
      }
    },
    image: {
      type: String,
      default: ""
    },
    qualityType: {
      type: String,
      enum: ["organic", "normal"],
      default: "normal"
    },
    harvestDate: {
      type: Date,
      required: true
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    views: {
      type: Number,
      default: 0
    },
    tags: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

cropListingSchema.index({ cropName: "text", "location.city": "text", "location.state": "text" });
cropListingSchema.index({ createdAt: -1, cropName: 1, "location.city": 1 });

export default mongoose.models.CropListing || mongoose.model("CropListing", cropListingSchema);
