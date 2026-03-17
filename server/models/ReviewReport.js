import mongoose from "mongoose";

const reviewReportSchema = new mongoose.Schema(
  {
    review:      { type: mongoose.Schema.Types.ObjectId, ref: "Review", required: true, index: true },
    reportedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
    reason:      { type: String, enum: ["spam", "fake", "abusive", "irrelevant", "other"], required: true },
    description: { type: String, maxlength: 500, default: "" },
    status:      { type: String, enum: ["pending", "reviewed", "dismissed"], default: "pending", index: true },
  },
  { timestamps: true }
);

export default mongoose.models.ReviewReport || mongoose.model("ReviewReport", reviewReportSchema);
