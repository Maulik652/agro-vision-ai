import mongoose from "mongoose";

const advisorySchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    content:     { type: String, required: true, maxlength: 10000 },
    summary:     { type: String, maxlength: 500, default: "" },
    category: {
      type: String,
      enum: ["crop", "market", "disease", "weather", "pest", "irrigation", "general"],
      default: "general"
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "active", "expired", "archived"],
      default: "draft",
      index: true
    },
    priority:    { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    images:      [{ type: String }],
    attachments: [{ name: String, url: String, type: String }],
    /* Targeting */
    targetAudience: [{ type: String, enum: ["farmers", "buyers", "all"] }],
    cropTypes:      [{ type: String }],
    regions:        [{ type: String }],
    farmerSize:     [{ type: String, enum: ["small", "medium", "large"] }],
    /* Scheduling */
    scheduledAt:  { type: Date, default: null },
    publishedAt:  { type: Date, default: null },
    expiresAt:    { type: Date, default: null },
    /* Stats (denormalized for fast reads) */
    views:        { type: Number, default: 0 },
    clicks:       { type: Number, default: 0 },
    reach:        { type: Number, default: 0 }
  },
  { timestamps: true }
);

advisorySchema.index({ createdBy: 1, status: 1, createdAt: -1 });
advisorySchema.index({ status: 1, scheduledAt: 1 });

export default mongoose.model("Advisory", advisorySchema);
