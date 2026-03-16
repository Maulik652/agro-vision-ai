import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    buyer:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fullName:   { type: String, required: true, trim: true, maxlength: 100 },
    phone:      { type: String, required: true, trim: true, maxlength: 20 },
    street:     { type: String, required: true, trim: true, maxlength: 200 },
    city:       { type: String, required: true, trim: true, maxlength: 100 },
    state:      { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 10 },
    isDefault:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Only one default address per buyer
addressSchema.index({ buyer: 1, isDefault: 1 });

export default mongoose.models.Address || mongoose.model("Address", addressSchema);
