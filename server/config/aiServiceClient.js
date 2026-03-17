import axios from "axios";

const AI_BASE = process.env.AI_SERVICE_URL || "http://localhost:8000";

const aiClient = axios.create({
  baseURL: AI_BASE,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" }
});

export default aiClient;
