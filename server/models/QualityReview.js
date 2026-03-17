import mongoose from "mongoose";

const qualityReviewSchema = new mongoose.Schema(
  {
    expert:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cropId:        { type: mongoose.Schema.Types.ObjectId, ref: "CropListing", required: true, index: true },
    farmer:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    qualityRating: { type: Number, required: true, min: 1, max: 5 },
    grading:       { type: String, enum: ["A+", "A", "B+", "B", "C", "D"], default: "B" },
    diseaseRisk:   { type: String, enum: ["none", "low", "medium", "high"], default: "none" },
    feedback:      { type: String, trim: true, maxlength: 2000, default: "" },
    images:        [{ type: String }],
    cropName:      { type: String, default: "" },
    status:        { type: String, enum: ["draft", "published"], default: "published" },
  },
  { timestamps: true }
);

export default mongoose.models.QualityReview || mongoose.model("QualityReview", qualityReviewSchema);
