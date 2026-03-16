import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import Expense from "../models/Expense.js";

const router = express.Router();

router.use(protect, authorize("farmer", "admin"));

/** GET /api/expenses */
router.get("/", async (req, res) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = { farmer: req.user._id };

    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)),
      Expense.countDocuments(filter)
    ]);

    return res.json({ success: true, data: expenses, total, page: Number(page) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** POST /api/expenses */
router.post("/", async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, farmer: req.user._id });
    return res.status(201).json({ success: true, data: expense });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** PUT /api/expenses/:id */
router.put("/:id", async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
    return res.json({ success: true, data: expense });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** DELETE /api/expenses/:id */
router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, farmer: req.user._id });
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
    return res.json({ success: true, message: "Expense deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** GET /api/expenses/summary — monthly summary */
router.get("/summary", async (req, res) => {
  try {
    const summary = await Expense.aggregate([
      { $match: { farmer: req.user._id } },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" }, category: "$category" },
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);
    return res.json({ success: true, data: summary });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
