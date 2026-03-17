import mongoose from "mongoose";

const adminActionLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    adminName: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String },
    targetId: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.AdminActionLog ||
  mongoose.model("AdminActionLog", adminActionLogSchema);
