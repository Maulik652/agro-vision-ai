import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import Expense from "../models/Expense.js";

const router = Router();

/* ─── POST /expenses ─── */
router.post("/", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const { category, type, amount, description, date, cropType, season, vendor, paymentMode, fieldId, tags } = req.body;
    if (!category || amount === undefined) {
      return res.status(400).json({ message: "category and amount are required" });
    }

    const expense = await Expense.create({
      farmer: req.user._id,
      field: fieldId || undefined,
      category,
      type: type || "expense",
      amount: Math.max(0, Number(amount)),
      description: (description || "").slice(0, 500),
      date: date ? new Date(date) : new Date(),
      cropType: (cropType || "").slice(0, 60),
      season: season || "kharif",
      vendor: (vendor || "").slice(0, 200),
      paymentMode: paymentMode || "cash",
      tags: Array.isArray(tags) ? tags.slice(0, 10) : []
    });

    return res.status(201).json({ success: true, expense });
  } catch (err) {
    console.error("Expense create error:", err);
    return res.status(500).json({ message: "Failed to create expense" });
  }
});

/* ─── GET /expenses ─── */
router.get("/", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const { cropType, category, type, season, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = { farmer: req.user._id };

    if (cropType) filter.cropType = new RegExp(`^${cropType}$`, "i");
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (season) filter.season = season;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)).lean(),
      Expense.countDocuments(filter)
    ]);

    return res.json({ success: true, expenses, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error("Expense fetch error:", err);
    return res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

/* ─── GET /expenses/summary ─── */
router.get("/summary", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const { cropType, season } = req.query;
    const match = { farmer: req.user._id };
    if (cropType) match.cropType = new RegExp(`^${cropType}$`, "i");
    if (season) match.season = season;

    const [categoryBreakdown, monthlyTrend, totals] = await Promise.all([
      Expense.aggregate([
        { $match: { ...match, type: "expense" } },
        { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: { month: { $month: "$date" }, year: { $year: "$date" }, type: "$type" },
            total: { $sum: "$amount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),
      Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const totalExpense = totals.find((t) => t._id === "expense")?.total || 0;
    const totalIncome = totals.find((t) => t._id === "income")?.total || 0;

    return res.json({
      success: true,
      summary: {
        totalExpense,
        totalIncome,
        profit: totalIncome - totalExpense,
        profitMargin: totalIncome > 0 ? +((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0,
        categoryBreakdown,
        monthlyTrend
      }
    });
  } catch (err) {
    console.error("Expense summary error:", err);
    return res.status(500).json({ message: "Failed to generate summary" });
  }
});

/* ─── DELETE /expenses/:id ─── */
router.delete("/:id", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const result = await Expense.deleteOne({ _id: req.params.id, farmer: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Expense not found" });
    return res.json({ success: true, message: "Expense deleted" });
  } catch (err) {
    console.error("Expense delete error:", err);
    return res.status(500).json({ message: "Failed to delete expense" });
  }
});

/* ─── PATCH /expenses/:id ─── */
router.patch("/:id", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const allowed = ["category", "type", "amount", "description", "date", "cropType", "season", "vendor", "paymentMode"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        update[key] = key === "amount" ? Math.max(0, Number(req.body[key])) : req.body[key];
      }
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user._id },
      { $set: update },
      { new: true }
    );

    if (!expense) return res.status(404).json({ message: "Expense not found" });
    return res.json({ success: true, expense });
  } catch (err) {
    console.error("Expense update error:", err);
    return res.status(500).json({ message: "Failed to update expense" });
  }
});

export default router;
