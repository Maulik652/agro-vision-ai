import mongoose from "mongoose";

const buyerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
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
    cropsInterested: {
      type: [String],
      default: []
    },
    rating: {
      type: Number,
      default: 4.4,
      min: 0,
      max: 5
    },
    verified: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

buyerProfileSchema.index({ "location.city": 1, cropsInterested: 1, rating: -1 });

export default mongoose.models.BuyerProfile || mongoose.model("BuyerProfile", buyerProfileSchema);
