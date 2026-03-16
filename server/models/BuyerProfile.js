import mongoose from "mongoose";

const buyerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    businessName: { type: String, default: "", trim: true, maxlength: 150 },
    location: {
      city: { type: String, default: "", trim: true },
      state: { type: String, default: "", trim: true },
    },
    cropsInterested: {
      type: [String],
      default: [],
    },
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    verified: { type: Boolean, default: false },
    totalOrders: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.BuyerProfile ||
  mongoose.model("BuyerProfile", buyerProfileSchema);
