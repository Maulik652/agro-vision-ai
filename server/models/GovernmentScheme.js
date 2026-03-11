import mongoose from "mongoose";

const governmentSchemeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    shortName: {
      type: String,
      trim: true,
      maxlength: 60
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000
    },
    ministry: {
      type: String,
      trim: true,
      maxlength: 200
    },
    category: {
      type: String,
      required: true,
      enum: [
        "subsidy", "insurance", "loan", "training",
        "infrastructure", "market", "irrigation", "organic", "other"
      ]
    },
    eligibility: {
      states: [String],
      minFarmSize: Number,
      maxFarmSize: Number,
      crops: [String],
      farmerTypes: [String]
    },
    benefits: {
      type: String,
      maxlength: 2000
    },
    applicationUrl: String,
    deadline: Date,
    documents: [String],
    amount: {
      min: Number,
      max: Number,
      unit: { type: String, default: "INR" }
    },
    status: {
      type: String,
      enum: ["active", "expired", "upcoming"],
      default: "active"
    },
    isVerified: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

governmentSchemeSchema.index({ category: 1, status: 1 });
governmentSchemeSchema.index({ "eligibility.states": 1 });

export default mongoose.model("GovernmentScheme", governmentSchemeSchema);
