import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import farmerRoutes from "./routes/farmerRoutes.js";

dotenv.config();

/* CONNECT DATABASE */
connectDB();

const app = express();

/* MIDDLEWARE */
app.use(cors({
  origin: "http://localhost:5173", // frontend URL (Vite)
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

/* START SERVER */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});