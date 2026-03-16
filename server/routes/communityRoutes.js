import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import CommunityPost from "../models/CommunityPost.js";

const router = express.Router();

router.use(protect, authorize("farmer", "buyer", "expert", "admin"));

/** GET /api/community — feed */
router.get("/", async (req, res) => {
  try {
    const { category, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (category) filter.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const [posts, total] = await Promise.all([
      CommunityPost.find(filter)
        .populate("author", "name avatar role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      CommunityPost.countDocuments(filter)
    ]);

    return res.json({ success: true, data: posts, total, page: Number(page) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** GET /api/community/:id — single post */
router.get("/:id", async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id)
      .populate("author", "name avatar role")
      .populate("comments.author", "name avatar");
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });
    return res.json({ success: true, data: post });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** POST /api/community — create post */
router.post("/", async (req, res) => {
  try {
    const post = await CommunityPost.create({ ...req.body, author: req.user._id });
    return res.status(201).json({ success: true, data: post });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** POST /api/community/:id/like — toggle like */
router.post("/:id/like", async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const userId = req.user._id.toString();
    const likedIdx = post.likes.findIndex((id) => id.toString() === userId);

    if (likedIdx > -1) {
      post.likes.splice(likedIdx, 1);
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();
    return res.json({ success: true, liked: likedIdx === -1, likes: post.likes.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** POST /api/community/:id/comments — add comment */
router.post("/:id/comments", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: "Comment text is required" });
    }

    const post = await CommunityPost.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { author: req.user._id, text } } },
      { new: true }
    ).populate("comments.author", "name avatar");

    if (!post) return res.status(404).json({ success: false, message: "Post not found" });
    return res.status(201).json({ success: true, data: post.comments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/** DELETE /api/community/:id — delete own post */
router.delete("/:id", async (req, res) => {
  try {
    const post = await CommunityPost.findOneAndDelete({
      _id: req.params.id,
      author: req.user._id
    });
    if (!post) return res.status(404).json({ success: false, message: "Post not found or not authorized" });
    return res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
