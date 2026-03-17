import mongoose from "mongoose";

const consultationMessageSchema = new mongoose.Schema(
  {
    consultation: { type: mongoose.Schema.Types.ObjectId, ref: "Consultation", required: true, index: true },
    sender:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message:      { type: String, default: "", trim: true, maxlength: 3000 },
    messageType:  { type: String, enum: ["text", "image", "file", "system"], default: "text" },
    attachments:  [{ url: String, name: String, type: String }],
    read:         { type: Boolean, default: false }
  },
  { timestamps: true }
);

consultationMessageSchema.index({ consultation: 1, createdAt: 1 });

export default mongoose.model("ConsultationMessage", consultationMessageSchema);
