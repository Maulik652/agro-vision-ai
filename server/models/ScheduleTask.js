import mongoose from "mongoose";

const scheduleTaskSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  description:{ type: String, default: "" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  deadline:   { type: Date },
  priority:   { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  status:     { type: String, enum: ["pending", "in_progress", "completed", "cancelled"], default: "pending" },
  taskType:   { type: String, enum: ["follow_up", "crop_inspection", "advisory", "general"], default: "general" },
  eventId:    { type: mongoose.Schema.Types.ObjectId, ref: "ScheduleEvent", default: null },
  completedAt:{ type: Date },
}, { timestamps: true });

scheduleTaskSchema.index({ assignedTo: 1, deadline: 1 });

export default mongoose.model("ScheduleTask", scheduleTaskSchema);
