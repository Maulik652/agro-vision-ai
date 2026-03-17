import mongoose from "mongoose";

const timelineEventSchema = new mongoose.Schema(
  {
    consultation: { type: mongoose.Schema.Types.ObjectId, ref: "Consultation", required: true, index: true },
    eventType: {
      type: String,
      enum: ["created","accepted","scheduled","started","message_sent","ai_analysis","recommendation_added","status_changed","escalated","completed","rejected"],
      required: true
    },
    description: { type: String, required: true, maxlength: 500 },
    actor:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    meta:         { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

timelineEventSchema.index({ consultation: 1, createdAt: 1 });

export default mongoose.model("TimelineEvent", timelineEventSchema);
