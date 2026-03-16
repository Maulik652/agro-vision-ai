/**
 * Message Model
 * Individual messages within a Conversation.
 * Supports text, image, and order_reference message types.
 * Tracks delivery and read status per message.
 */
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    messageType: {
      type: String,
      enum: ["text", "image", "order_reference"],
      default: "text",
    },

    text:     { type: String, default: "", trim: true, maxlength: 2000 },
    imageUrl: { type: String, default: "" },

    // For order_reference messages — embeds order context inline
    orderRef: {
      orderId:   { type: String, default: null },
      cropName:  { type: String, default: null },
      quantity:  { type: Number, default: null },
      totalAmount: { type: Number, default: null },
    },

    // Delivery lifecycle: sent → delivered → read
    deliveryStatus: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true,
    },

    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Paginated message fetch: conversation + time descending
messageSchema.index({ conversation: 1, createdAt: -1 });

export default mongoose.models.Message ||
  mongoose.model("Message", messageSchema);
