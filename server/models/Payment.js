import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    // Links to the parent checkout session (groups all sub-orders)
    parentOrderId: { type: String, required: true, index: true },
    buyer:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    paymentGateway: { type: String, enum: ["razorpay", "stripe", "wallet"], required: true },

    // Gateway-specific IDs
    gatewayOrderId: { type: String, default: null }, // Razorpay order_id / Stripe PaymentIntent id
    paymentId:      { type: String, default: null }, // Razorpay payment_id after capture
    signature:      { type: String, default: null }, // Razorpay signature for verification

    amount:   { type: Number, required: true },
    currency: { type: String, default: "INR" },

    status: {
      type: String,
      enum: ["created", "attempted", "paid", "failed", "refunded"],
      default: "created",
      index: true,
    },

    // Raw webhook/callback payload for audit
    gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
