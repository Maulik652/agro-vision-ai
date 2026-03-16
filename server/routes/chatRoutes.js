import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validateBody, validateQuery } from "../middleware/zodValidate.js";
import { startConversationSchema, getMessagesSchema } from "../validation/chatValidation.js";
import {
  startConversation,
  getConversations,
  getMessages,
  markRead,
  getUnreadCount,
} from "../controllers/chatController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("buyer", "farmer", "admin"));

router.post("/start",                    validateBody(startConversationSchema), startConversation);
router.get("/conversations",             getConversations);
router.get("/messages/:conversationId",  validateQuery(getMessagesSchema),      getMessages);
router.put("/read/:conversationId",      markRead);
router.get("/unread",                    getUnreadCount);

export default router;
