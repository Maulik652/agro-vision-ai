import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending"
    },
    type: {
      type: String,
      enum: ["inbound", "outbound"],
      default: "inbound"
    },
    remark: {
      type: String,
      trim: true,
      default: ""
    },
    transactionDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ user: 1, status: 1, transactionDate: -1 });

export default mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
