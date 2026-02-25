import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes here require farmer role
router.use(protect, authorize("farmer"));

router.get("/dashboard", (req, res) => {
  res.json({ message: `Welcome ${req.user.name} to Farmer Dashboard` });
});

router.get("/ai-scan", (req, res) => {
  res.json({ message: "AI Scan page for farmer" });
});

router.get("/predictions", (req, res) => {
  res.json({ message: "Predictions page for farmer" });
});

router.get("/marketplace", (req, res) => {
  res.json({ message: "Marketplace page for farmer" });
});

router.get("/advisory", (req, res) => {
  res.json({ message: "Expert Advisory for farmer" });
});

router.get("/weather", (req, res) => {
  res.json({ message: "Weather insights for farmer" });
});

export default router;