import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

router.use(protect, authorize("buyer", "admin"));

/** GET /api/buyers/profile — current buyer's profile */
router.get("/profile", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -__v");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** PUT /api/buyers/profile — update buyer's profile */
router.put("/profile", async (req, res) => {
  try {
    const { name, phone, location, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name, phone, location, avatar } },
      { new: true, runValidators: true }
    ).select("-password -__v");
    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
