import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    reviewer:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetUser:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    transactionId: { type: String, default: null, index: true },
    reviewType:    { type: String, enum: ["consultation", "order", "crop_quality"], default: "order" },
    rating:        { type: Number, required: true, min: 1, max: 5 },
    comment:       { type: String, trim: true, maxlength: 2000, default: "" },
    images:        [{ type: String }],
    cropName:      { type: String, default: "" },
    // AI analysis
    sentiment:     { type: String, enum: ["positive", "neutral", "negative", "unanalyzed"], default: "unanalyzed" },
    sentimentScore:{ type: Number, default: 0 },
    spamScore:     { type: Number, default: 0, min: 0, max: 1 },
    // Moderation
    status:        { type: String, enum: ["active", "flagged", "removed", "pending"], default: "active", index: true },
    reportCount:   { type: Number, default: 0 },
    moderatedAt:   { type: Date, default: null },
    moderatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

reviewSchema.index({ targetUser: 1, status: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, transactionId: 1 }, { unique: true, sparse: true });

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);
