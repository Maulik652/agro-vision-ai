import mongoose from "mongoose";

const consultationRecommendationSchema = new mongoose.Schema(
  {
    consultation:       { type: mongoose.Schema.Types.ObjectId, ref: "Consultation", required: true, index: true },
    expert:             { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    treatmentAdvice:    { type: String, default: "", maxlength: 3000 },
    fertilizerSuggestion: { type: String, default: "", maxlength: 1000 },
    marketGuidance:     { type: String, default: "", maxlength: 1000 },
    followUpRequired:   { type: Boolean, default: false },
    followUpDate:       { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("ConsultationRecommendation", consultationRecommendationSchema);
