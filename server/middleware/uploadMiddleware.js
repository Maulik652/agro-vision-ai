/**
 * Upload Middleware — chat image uploads
 * Saves to /uploads/chat/ on disk, serves via /uploads static route.
 * Max 5MB, images only.
 */
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "chat");

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() || ".jpg";
    const name = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(Object.assign(new Error("Only image files allowed"), { status: 400 }), false);
};

export const uploadChatImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single("image");
