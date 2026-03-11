import mongoose from "mongoose";

const farmFieldSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    fieldName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    cropType: {
      type: String,
      trim: true,
      maxlength: 60
    },
    fieldSize: {
      type: Number,
      min: 0,
      max: 100000
    },
    unit: {
      type: String,
      enum: ["acre", "hectare", "bigha", "gunta"],
      default: "acre"
    },
    soilType: {
      type: String,
      enum: ["clay", "sandy", "loamy", "silt", "red", "black", "laterite", "alluvial", "other"],
      default: "loamy"
    },
    waterSource: {
      type: String,
      enum: ["borewell", "canal", "river", "rain-fed", "pond", "drip", "sprinkler", "other"],
      default: "borewell"
    },
    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      lat: Number,
      lng: Number
    },
    boundary: {
      type: [[Number]],
      default: []
    },
    sowingDate: Date,
    expectedHarvestDate: Date,
    season: {
      type: String,
      enum: ["kharif", "rabi", "zaid", "perennial"],
      default: "kharif"
    },
    soilHealth: {
      nitrogen: { type: Number, min: 0, max: 1000 },
      phosphorus: { type: Number, min: 0, max: 1000 },
      potassium: { type: Number, min: 0, max: 1000 },
      ph: { type: Number, min: 0, max: 14 },
      organicCarbon: { type: Number, min: 0, max: 100 },
      lastTestedAt: Date
    },
    status: {
      type: String,
      enum: ["active", "fallow", "harvested", "preparing"],
      default: "active"
    },
    notes: {
      type: String,
      maxlength: 500
    }
  },
  { timestamps: true }
);

farmFieldSchema.index({ farmer: 1, status: 1 });

export default mongoose.model("FarmField", farmFieldSchema);
