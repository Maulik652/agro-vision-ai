import mongoose from "mongoose";

const diseaseReportSchema = new mongoose.Schema(
  {
    farmer:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cropName:     { type: String, required: true, trim: true, maxlength: 100 },
    cropImage:    { type: String, default: "" },
    diseaseDetected: { type: String, default: "None", trim: true },
    confidence:   { type: Number, min: 0, max: 100, default: 0 },
    severity:     { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
    location:     { city: String, state: String },
    aiModel:      { type: String, default: "cnn_disease_classifier" },
    reviewed:     { type: Boolean, default: false },
    expertNote:   { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("DiseaseReport", diseaseReportSchema);
