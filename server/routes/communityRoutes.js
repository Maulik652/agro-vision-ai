import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import CommunityPost from "../models/CommunityPost.js";

const router = Router();

/* ─── GET /community ─── */
router.get("/", protect, async (req, res) => {
  try {
    const { category, cropTag, page = 1, limit = 20, sort = "latest" } = req.query;
    const filter = { status: "active" };
    if (category) filter.category = category;
    if (cropTag) filter.cropTag = new RegExp(`^${cropTag}$`, "i");

    const sortMap = {
      latest: { createdAt: -1 },
      popular: { views: -1 },
      most_replies: { "replies.length": -1 }
    };
    const sortBy = sortMap[sort] || sortMap.latest;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [posts, total] = await Promise.all([
      CommunityPost.find(filter)
        .populate("author", "name city state role")
        .sort(sortBy)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CommunityPost.countDocuments(filter)
    ]);

    return res.json({ success: true, posts, total, page: Number(page) });
  } catch (err) {
    console.error("Community fetch error:", err);
    return res.status(500).json({ message: "Failed to fetch posts" });
  }
});

/* ─── GET /community/:id ─── */
router.get("/:id", protect, async (req, res) => {
  try {
    const post = await CommunityPost.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("author", "name city state role")
      .populate("replies.author", "name role")
      .lean();

    if (!post) return res.status(404).json({ message: "Post not found" });
    return res.json({ success: true, post });
  } catch (err) {
    console.error("Community post error:", err);
    return res.status(500).json({ message: "Failed to fetch post" });
  }
});

/* ─── POST /community ─── */
router.post("/", protect, authorize("farmer", "expert", "admin"), async (req, res) => {
  try {
    const { category, cropTag, title, content } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ message: "title, content, and category are required" });
    }

    const post = await CommunityPost.create({
      author: req.user._id,
      category,
      cropTag: (cropTag || "").slice(0, 60),
      title: title.slice(0, 300),
      content: content.slice(0, 5000),
      region: { state: req.user.state, city: req.user.city }
    });

    return res.status(201).json({ success: true, post });
  } catch (err) {
    console.error("Community create error:", err);
    return res.status(500).json({ message: "Failed to create post" });
  }
});

/* ─── POST /community/:id/reply ─── */
router.post("/:id/reply", protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "content is required" });

    const post = await CommunityPost.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          replies: {
            author: req.user._id,
            content: content.slice(0, 2000),
            isExpert: req.user.role === "expert",
            createdAt: new Date()
          }
        }
      },
      { new: true }
    )
      .populate("replies.author", "name role")
      .lean();

    if (!post) return res.status(404).json({ message: "Post not found" });
    return res.json({ success: true, post });
  } catch (err) {
    console.error("Community reply error:", err);
    return res.status(500).json({ message: "Failed to add reply" });
  }
});

/* ─── POST /community/:id/vote ─── */
router.post("/:id/vote", protect, async (req, res) => {
  try {
    const { type } = req.body;
    if (!["upvote", "downvote"].includes(type)) {
      return res.status(400).json({ message: "type must be upvote or downvote" });
    }

    const userId = req.user._id;
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (type === "upvote") {
      const idx = post.upvotes.indexOf(userId);
      if (idx > -1) post.upvotes.splice(idx, 1);
      else post.upvotes.push(userId);
      const dIdx = post.downvotes.indexOf(userId);
      if (dIdx > -1) post.downvotes.splice(dIdx, 1);
    } else {
      const idx = post.downvotes.indexOf(userId);
      if (idx > -1) post.downvotes.splice(idx, 1);
      else post.downvotes.push(userId);
      const uIdx = post.upvotes.indexOf(userId);
      if (uIdx > -1) post.upvotes.splice(uIdx, 1);
    }

    await post.save();
    return res.json({
      success: true,
      upvotes: post.upvotes.length,
      downvotes: post.downvotes.length
    });
  } catch (err) {
    console.error("Community vote error:", err);
    return res.status(500).json({ message: "Failed to vote" });
  }
});

export default router;
