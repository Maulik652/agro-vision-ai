import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 120
  },

  phone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },

  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },

  role: {
    type: String,
    enum: ["farmer", "buyer", "expert", "admin"],
    default: "farmer"
  },

  state: {
    type: String,
    required: true,
    trim: true
  },

  city: {
    type: String,
    required: true,
    trim: true
  },

  farmSize: Number,
  crops: String,

  company: String,
  license: String,

  qualification: String,
  experience: Number,

  // Profile panel fields
  location: { type: String, default: "", trim: true },
  bio:      { type: String, default: "", maxlength: 500 },
  photo:    { type: String, default: "" },

  failedLoginAttempts: {
    type: Number,
    default: 0,
    select: false
  },

  lockUntil: {
    type: Date,
    default: null,
    select: false
  },

  lastLoginAt: {
    type: Date,
    default: null
  },

  status: {
    type: String,
    enum: ["active", "suspended", "blocked"],
    default: "active",
  },

  isDeleted: {
    type: Boolean,
    default: false,
  },

},
{ timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);