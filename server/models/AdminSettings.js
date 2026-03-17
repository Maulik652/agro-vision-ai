import mongoose from "mongoose";

const adminSettingsSchema = new mongoose.Schema(
  {
    commissionPercent: { type: Number, default: 5 },
    platformFee: { type: Number, default: 2 },
    autoApproveListings: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false },
    maxOrderValue: { type: Number, default: 500000 },
    fraudThreshold: { type: Number, default: 3 },
    aiEnabled: { type: Boolean, default: true },
    razorpayEnabled: { type: Boolean, default: true },
    stripeEnabled: { type: Boolean, default: false },
    supportEmail: { type: String, default: "support@agrovision.ai" },
    reportSchedule: { type: String, enum: ["daily", "weekly", "monthly"], default: "weekly" },
  },
  { timestamps: true }
);

export default mongoose.models.AdminSettings ||
  mongoose.model("AdminSettings", adminSettingsSchema);
