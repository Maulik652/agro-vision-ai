import mongoose from "mongoose";

const qualityReportSchema = new mongoose.Schema(
  {
    farmer:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cropName:   { type: String, required: true, trim: true },
    cropImage:  { type: String, default: "" },
    aiGrade:    { type: String, enum: ["A", "B", "C", "D"], default: "B" },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    defects:    [{ type: String }],
    aiModel:    { type: String, default: "cnn_quality_classifier" },
    reviewed:   { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("QualityReport", qualityReportSchema);
