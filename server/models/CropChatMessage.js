import mongoose from "mongoose";

/**
 * Persistent chat messages for buyer-farmer negotiation on crop detail page.
 * Message type supports text, image sharing, and offer negotiation payloads.
 */
const cropChatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    cropId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CropListing",
      required: true,
      index: true
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    messageType: {
      type: String,
      enum: ["text", "image", "offer"],
      default: "text"
    },
    text: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000
    },
    imageUrl: {
      type: String,
      default: ""
    },
    offer: {
      amount: {
        type: Number,
        default: null,
        min: 0
      },
      quantity: {
        type: Number,
        default: null,
        min: 0
      },
      note: {
        type: String,
        default: "",
        trim: true,
        maxlength: 300
      }
    }
  },
  {
    timestamps: true
  }
);

cropChatMessageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.models.CropChatMessage ||
  mongoose.model("CropChatMessage", cropChatMessageSchema);
