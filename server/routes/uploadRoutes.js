/**
 * Upload Routes — POST /api/upload/chat-image
 * Authenticated users only. Returns { url } pointing to the saved file.
 */
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { uploadChatImage } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/chat-image", protect, (req, res) => {
  uploadChatImage(req, res, (err) => {
    if (err) {
      const status = err.status ?? (err.code === "LIMIT_FILE_SIZE" ? 413 : 400);
      const message = err.code === "LIMIT_FILE_SIZE"
        ? "Image must be under 5MB"
        : (err.message ?? "Upload failed");
      return res.status(status).json({ success: false, message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file received" });
    }

    // Build public URL — served by express.static from /uploads
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const url = `${baseUrl}/uploads/chat/${req.file.filename}`;

    res.json({ success: true, url });
  });
});

export default router;
