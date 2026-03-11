import mongoose from "mongoose";

const communityPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        "question", "tip", "success-story", "market-update",
        "weather-alert", "pest-warning", "technique", "general"
      ]
    },
    cropTag: {
      type: String,
      trim: true,
      maxlength: 60
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    imageUrl: String,
    upvotes: {
      type: [mongoose.Schema.Types.ObjectId],
      default: []
    },
    downvotes: {
      type: [mongoose.Schema.Types.ObjectId],
      default: []
    },
    replies: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        content: { type: String, trim: true, maxlength: 2000 },
        isExpert: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    views: {
      type: Number,
      default: 0
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    region: {
      state: String,
      city: String
    },
    status: {
      type: String,
      enum: ["active", "closed", "flagged"],
      default: "active"
    }
  },
  { timestamps: true }
);

communityPostSchema.index({ category: 1, createdAt: -1 });
communityPostSchema.index({ cropTag: 1 });
communityPostSchema.index({ "region.state": 1 });

export default mongoose.model("CommunityPost", communityPostSchema);
