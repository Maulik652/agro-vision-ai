import mongoose from "mongoose";

const expertRecommendationSchema = new mongoose.Schema(
  {
    expert:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title:     { type: String, required: true, trim: true, maxlength: 200 },
    body:      { type: String, required: true, trim: true, maxlength: 2000 },
    cropName:  { type: String, default: "", trim: true },
    region:    { type: String, default: "", trim: true },
    tags:      [{ type: String, trim: true }],
    priority:  { type: String, enum: ["low", "medium", "high"], default: "medium" },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("ExpertRecommendation", expertRecommendationSchema);
