import mongoose from "mongoose";

const farmGPTChatSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    messages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant"],
          required: true
        },
        content: {
          type: String,
          required: true,
          maxlength: 5000
        },
        context: {
          weather: mongoose.Schema.Types.Mixed,
          market: mongoose.Schema.Types.Mixed,
          scan: mongoose.Schema.Types.Mixed,
          field: mongoose.Schema.Types.Mixed
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ],
    farmContext: {
      crops: [String],
      location: {
        city: String,
        state: String
      },
      farmSize: Number,
      soilType: String,
      season: String
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "New Chat"
    }
  },
  { timestamps: true }
);

farmGPTChatSchema.index({ farmer: 1, createdAt: -1 });

export default mongoose.model("FarmGPTChat", farmGPTChatSchema);
