import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  phone: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true,
    minlength: 6
  },

  role: {
    type: String,
    enum: ["farmer", "buyer", "expert", "admin"],
    default: "farmer"
  },

  state: {
    type: String,
    required: true
  },

  city: {
    type: String,
    required: true
  },

  farmSize: Number,
  crops: String,

  company: String,
  license: String,

  qualification: String,
  experience: Number

},
{ timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);