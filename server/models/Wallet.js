import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingPayments: {
      type: Number,
      default: 0,
      min: 0
    },
    escrowBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    lastTransaction: {
      amount: { type: Number, default: 0 },
      type: { type: String, enum: ["credit", "debit"], default: "credit" },
      notes: { type: String, default: "" },
      date: { type: Date, default: Date.now }
    }
  },
  {
    timestamps: true
  }
);

walletSchema.index({ user: 1 });

export default mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);
