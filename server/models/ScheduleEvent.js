import mongoose from "mongoose";

const scheduleEventSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  description:  { type: String, default: "" },
  type:         { type: String, enum: ["consultation", "task", "reminder", "meeting", "booking"], default: "task" },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  startTime:    { type: Date, required: true },
  endTime:      { type: Date, required: true },
  status:       { type: String, enum: ["scheduled", "ongoing", "completed", "cancelled"], default: "scheduled" },
  priority:     { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  consultationId: { type: mongoose.Schema.Types.ObjectId, ref: "Consultation", default: null },
  color:        { type: String, default: "#16a34a" },
  reminder:     { type: Number, default: 15 }, // minutes before
  reminderSent: { type: Boolean, default: false },
}, { timestamps: true });

scheduleEventSchema.index({ createdBy: 1, startTime: 1 });
scheduleEventSchema.index({ participants: 1, startTime: 1 });

export default mongoose.model("ScheduleEvent", scheduleEventSchema);
