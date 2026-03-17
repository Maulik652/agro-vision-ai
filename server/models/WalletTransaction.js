/**
 * WalletTransaction Model
 * Immutable ledger of every wallet event.
 * type: credit = money in, debit = money out
 * referenceId: links to orderId / paymentId / refund source
 */
import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    // "topup" | "order_payment" | "consultation_payment" | "refund" | "escrow_release"
    category: {
      type: String,
      enum: ["topup", "order_payment", "consultation_payment", "refund", "escrow_release"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
      index: true,
    },
    paymentGateway: {
      type: String,
      enum: ["razorpay", "stripe", "wallet", "system"],
      default: "system",
    },
    // Links to order, payment, or refund source
    referenceId: { type: String, default: null },
    description: { type: String, default: "", maxlength: 200 },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.WalletTransaction ||
  mongoose.model("WalletTransaction", walletTransactionSchema);
