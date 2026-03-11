import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    field: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FarmField"
    },
    cropType: {
      type: String,
      trim: true,
      maxlength: 60
    },
    category: {
      type: String,
      required: true,
      enum: [
        "seeds", "fertilizer", "pesticide", "labor", "fuel",
        "equipment", "irrigation", "transport", "packaging",
        "rent", "insurance", "loan-interest", "other"
      ]
    },
    type: {
      type: String,
      enum: ["expense", "income"],
      default: "expense"
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    season: {
      type: String,
      enum: ["kharif", "rabi", "zaid", "perennial"],
      default: "kharif"
    },
    vendor: {
      type: String,
      trim: true,
      maxlength: 200
    },
    paymentMode: {
      type: String,
      enum: ["cash", "upi", "bank-transfer", "credit", "other"],
      default: "cash"
    },
    receiptUrl: String,
    tags: [String]
  },
  { timestamps: true }
);

expenseSchema.index({ farmer: 1, date: -1 });
expenseSchema.index({ farmer: 1, category: 1 });
expenseSchema.index({ farmer: 1, cropType: 1, season: 1 });

export default mongoose.model("Expense", expenseSchema);
