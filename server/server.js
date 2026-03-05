import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import farmerRoutes from "./routes/farmerRoutes.js";

dotenv.config();

/* CONNECT DATABASE */
connectDB();

const app = express();
app.disable("x-powered-by");

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/* MIDDLEWARE */
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/farmer", farmerRoutes);

/* HEALTH CHECK ROUTE */
app.get("/", (req, res) => {
  res.send("API is running...");
});

/* 404 HANDLER */
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

app.use((error, req, res, next) => {
  if (error.message === "Not allowed by CORS") {
    return res.status(403).json({
      message: "CORS policy blocked this origin"
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      message: "Payload too large"
    });
  }

  console.error("Unhandled server error:", error);

  return res.status(500).json({
    message: "Internal server error"
  });
});

/* START SERVER */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});