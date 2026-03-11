import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import FarmGPTChat from "../models/FarmGPTChat.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AI_DIR = path.resolve(__dirname, "../../ai_service");

const router = Router();

/* helper: call Python farmgpt_engine */
const callFarmGPT = (question, context) =>
  new Promise((resolve) => {
    const ctxStr = JSON.stringify(context);
    const proc = spawn("python", [path.join(AI_DIR, "farmgpt_engine.py"), question, ctxStr], {
      timeout: 15000,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" }
    });

    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("close", (code) => {
      try {
        const parsed = JSON.parse(out);
        resolve(parsed);
      } catch {
        resolve(null);
      }
    });
    proc.on("error", () => resolve(null));
  });

/* Fallback response if Python fails */
const buildFallbackResponse = (question, context) => {
  const crop = context.crop || "your crop";
  const city = context.city || "your area";
  return {
    success: true,
    intent: "general",
    response: `🌿 **FarmGPT Advisory**\n\nI received your question: *"${question}"*\n\nBased on your profile (${crop} in ${city}), here are some general recommendations:\n\n• Monitor your field daily for early signs of pests or disease\n• Follow your crop calendar for timely fertilizer and irrigation\n• Check the Weather page for spray-safe windows\n• Use the Marketplace to compare prices before selling\n\n⚠️ *For crop-specific advice, ensure your farm profile has the correct crop type and sowing date.*`,
    disclaimer: "Advisory only — verify with your local agronomist."
  };
};

/* ─── POST /farmgpt/chat ─── */
router.post("/chat", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const { question, sessionId, farmContext } = req.body;
    if (!question || typeof question !== "string" || question.trim().length < 2) {
      return res.status(400).json({ message: "Question is required (min 2 chars)" });
    }

    const safeQuestion = question.trim().slice(0, 1000);

    /* Build context from user profile + provided data */
    const user = req.user;
    const context = {
      crop: farmContext?.crop || user.crops || "Wheat",
      city: farmContext?.city || user.city || "",
      state: farmContext?.state || user.state || "",
      farm_size: farmContext?.farmSize || user.farmSize || 2,
      soilType: farmContext?.soilType || "loamy",
      sowingDate: farmContext?.sowingDate || null,
      weather: farmContext?.weather || null,
      market: farmContext?.market || null,
      last_scan: farmContext?.lastScan || null,
      soil_health: farmContext?.soilHealth || null,
      season: farmContext?.season || "kharif"
    };

    /* Call Python AI */
    let aiResult = await callFarmGPT(safeQuestion, context);
    if (!aiResult || !aiResult.success) {
      aiResult = buildFallbackResponse(safeQuestion, context);
    }

    /* Save to chat history */
    const sid = sessionId || `session_${user._id}_${Date.now()}`;
    let chat = await FarmGPTChat.findOne({ farmer: user._id, sessionId: sid });

    if (!chat) {
      chat = new FarmGPTChat({
        farmer: user._id,
        sessionId: sid,
        farmContext: {
          crops: [context.crop],
          location: { city: context.city, state: context.state },
          farmSize: context.farm_size,
          soilType: context.soilType,
          season: context.season
        },
        messages: [],
        title: safeQuestion.slice(0, 80)
      });
    }

    chat.messages.push({ role: "user", content: safeQuestion });
    chat.messages.push({
      role: "assistant",
      content: aiResult.response,
      context: {
        weather: context.weather,
        market: context.market,
        scan: context.last_scan
      }
    });

    await chat.save();

    return res.json({
      success: true,
      sessionId: sid,
      response: aiResult.response,
      intent: aiResult.intent,
      context_used: aiResult.context_used,
      disclaimer: aiResult.disclaimer
    });
  } catch (err) {
    console.error("FarmGPT chat error:", err);
    return res.status(500).json({ message: "FarmGPT service unavailable" });
  }
});

/* ─── GET /farmgpt/sessions ─── */
router.get("/sessions", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const chats = await FarmGPTChat.find({ farmer: req.user._id })
      .select("sessionId title farmContext createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return res.json({ success: true, sessions: chats });
  } catch (err) {
    console.error("FarmGPT sessions error:", err);
    return res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

/* ─── GET /farmgpt/session/:sessionId ─── */
router.get("/session/:sessionId", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    const chat = await FarmGPTChat.findOne({
      farmer: req.user._id,
      sessionId: req.params.sessionId
    }).lean();

    if (!chat) return res.status(404).json({ message: "Session not found" });

    return res.json({ success: true, chat });
  } catch (err) {
    console.error("FarmGPT session error:", err);
    return res.status(500).json({ message: "Failed to fetch session" });
  }
});

/* ─── DELETE /farmgpt/session/:sessionId ─── */
router.delete("/session/:sessionId", protect, authorize("farmer", "admin"), async (req, res) => {
  try {
    await FarmGPTChat.deleteOne({
      farmer: req.user._id,
      sessionId: req.params.sessionId
    });
    return res.json({ success: true, message: "Session deleted" });
  } catch (err) {
    console.error("FarmGPT delete error:", err);
    return res.status(500).json({ message: "Failed to delete session" });
  }
});

export default router;
