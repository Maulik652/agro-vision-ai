import mongoose from "mongoose";

const automationRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    condition: { type: String, required: true },
    action: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    triggerCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.AutomationRule ||
  mongoose.model("AutomationRule", automationRuleSchema);
