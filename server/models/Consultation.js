import mongoose from "mongoose";

const scheduledMeetingSchema = new mongoose.Schema(
  {
    date:        { type: String, required: true },
    time:        { type: String, required: true },
    meetingType: { type: String, enum: ["video", "phone", "chat"], default: "video" },
    meetingLink: { type: String, default: "" },
    notes:       { type: String, default: "", maxlength: 500 }
  },
  { _id: false }
);

const aiAnalysisSchema = new mongoose.Schema(
  {
    disease:     { type: String, default: "" },
    confidence:  { type: Number, default: 0 },
    treatment:   { type: String, default: "" },
    severity:    { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
    analyzedAt:  { type: Date }
  },
  { _id: false }
);

const consultationSchema = new mongoose.Schema(
  {
    expert:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    user:            { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cropType:        { type: String, required: true, trim: true, maxlength: 100 },
    problemCategory: {
      type: String,
      enum: ["disease", "pest", "nutrition", "irrigation", "market", "weather", "general"],
      default: "general"
    },
    description:     { type: String, required: true, trim: true, maxlength: 3000 },
    images:          [{ type: String }],
    farmLocation:    { city: String, state: String },
    status: {
      type: String,
      enum: ["pending", "accepted", "scheduled", "in_progress", "completed", "rejected"],
      default: "pending",
      index: true
    },
    priority:        { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    consultationFee: { type: Number, default: 0, min: 0 },
    paymentStatus:   { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    paymentId:       { type: String, default: null },
    aiAnalysis:      { type: aiAnalysisSchema, default: null },
    scheduledMeeting:{ type: scheduledMeetingSchema, default: null },
    rejectionReason: { type: String, default: "" },
    completedAt:     { type: Date },
    acceptedAt:      { type: Date },
    escalatedAt:     { type: Date },
    reminderSentAt:  { type: Date }
  },
  { timestamps: true }
);

consultationSchema.index({ expert: 1, status: 1, createdAt: -1 });
consultationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Consultation", consultationSchema);
