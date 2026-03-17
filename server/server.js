import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import { initializeRedisCache } from "./config/redis.js";

import authRoutes from "./routes/authRoutes.js";
import farmerRoutes from "./routes/farmerRoutes.js";
import farmersRoutes from "./routes/farmersRoutes.js";
import predictRoutes from "./routes/predictRoutes.js";
import scanRoutes from "./routes/scanRoutes.js";
import cropRoutes from "./routes/cropRoutes.js";
import buyerRoutes from "./routes/buyerRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import marketAIRoutes from "./routes/marketAIRoutes.js";
import farmRoutes from "./routes/farmRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import soilRoutes from "./routes/soilRoutes.js";
import satelliteRoutes from "./routes/satelliteRoutes.js";
import farmGPTRoutes from "./routes/farmGPTRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";
import schemeRoutes from "./routes/schemeRoutes.js";
import fieldRoutes from "./routes/fieldRoutes.js";
import { initializeSocketServer } from "./realtime/socketServer.js";
import { seedAdminUser } from "./scripts/seedAdmin.js";
import buyerDashboardRoutes from "./routes/buyerDashboardRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import expertRoutes from "./routes/expertRoutes.js";
import consultationRequestRoutes from "./routes/consultationRequestRoutes.js";
import publicAdvisoryRoutes from "./routes/publicAdvisoryRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import farmerMarketplaceRoutes from "./routes/farmerMarketplaceRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";


dotenv.config();

/* CONNECT DATABASE */
connectDB().then(() => seedAdminUser()).catch(() => {});
initializeRedisCache();

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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/farmer", farmerRoutes);
app.use("/api/farmers", farmersRoutes);
app.use("/api/farm", farmRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/soil", soilRoutes);
app.use("/api/predict", predictRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/crops", cropRoutes);
app.use("/api/buyers", buyerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/ai", marketAIRoutes);
app.use("/api/satellite", satelliteRoutes);
app.use("/api/farmgpt", farmGPTRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/schemes", schemeRoutes);
app.use("/api/fields", fieldRoutes);
app.use("/api/buyer/dashboard", buyerDashboardRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/expert", expertRoutes);
app.use("/api/consultations", consultationRequestRoutes);
app.use("/api/advisories/public", publicAdvisoryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/farmer/marketplace", farmerMarketplaceRoutes);
app.use("/api/admin", adminRoutes);
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
const httpServer = http.createServer(app);
initializeSocketServer(httpServer, { allowedOrigins });

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});