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
    variety: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120
    },
    grade: {
      type: String,
      enum: ["A", "B", "C"],
      default: "B"
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
    moisturePercent: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    shelfLifeDays: {
      type: Number,
      min: 1,
      max: 45,
      default: 7
    },
    packagingType: {
      type: String,
      default: "standard-bag",
      trim: true,
      maxlength: 80
    },
    minOrderQty: {
      type: Number,
      min: 1,
      default: 50
    },
    negotiable: {
      type: Boolean,
      default: true
    },
    deliveryOptions: {
      type: [String],
      default: ["farm-pickup"]
    },
    certifications: {
      type: [String],
      default: []
    },
    responseSlaHours: {
      type: Number,
      min: 1,
      max: 72,
      default: 12
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
    status: {
      type: String,
      enum: ["active", "sold", "expired"],
      default: "active",
      index: true
    },
    aiSellReadiness: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    aiPriceBand: {
      min: { type: Number, default: null },
      ideal: { type: Number, default: null },
      max: { type: Number, default: null }
    },
    aiUrgency: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", null],
      default: null
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
