import express from "express";
import {
	registerUser,
	loginUser,
	logoutUser,
	getCurrentUser
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
	loginLimiter,
	loginValidation,
	registerLimiter,
	registerValidation,
	validateRequest
} from "../middleware/validateMiddleware.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

const router = express.Router();

router.post("/register", registerLimiter, registerValidation, validateRequest, registerUser);
router.post("/login",    loginLimiter,    loginValidation,    validateRequest, loginUser);
router.post("/logout", logoutUser);
router.get("/me", protect, getCurrentUser);

/** PUT /api/auth/profile — update name/phone/location/bio for any role */
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, phone, location, bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name, phone, location, bio } },
      { new: true, runValidators: true }
    ).select("-password -__v");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** PUT /api/auth/change-password */
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "Both passwords are required" });
    if (newPassword.length < 8)
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ success: false, message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** POST /api/auth/upload-photo — base64 or URL photo update */
router.post("/upload-photo", protect, async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ success: false, message: "No photo provided" });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { photo } },
      { new: true }
    ).select("-password -__v");
    return res.json({ success: true, photo: user.photo });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;