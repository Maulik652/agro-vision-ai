/**
 * Conversation Model
 * Represents a direct messaging thread between one buyer and one farmer.
 * A conversation is unique per (buyer, farmer) pair — enforced by compound index.
 * Messages reference this document via conversationId.
 */
import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    buyer:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Denormalized last message for conversation list rendering (avoids extra query)
    lastMessage:   { type: String, default: "" },
    lastMessageAt: { type: Date,   default: null },
    lastSenderId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Unread counters per participant — incremented on new message, reset on read
    unreadBuyer:  { type: Number, default: 0, min: 0 },
    unreadFarmer: { type: Number, default: 0, min: 0 },

    // Optional: link conversation to a specific order for context
    orderId:   { type: String, default: null },
    cropId:    { type: mongoose.Schema.Types.ObjectId, ref: "CropListing", default: null },
    cropName:  { type: String, default: null },
  },
  { timestamps: true }
);

// Enforce one conversation per buyer-farmer pair
conversationSchema.index({ buyer: 1, farmer: 1 }, { unique: true });
conversationSchema.index({ buyer: 1, lastMessageAt: -1 });
conversationSchema.index({ farmer: 1, lastMessageAt: -1 });

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);
