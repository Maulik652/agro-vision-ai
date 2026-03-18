/**
 * Admin Namespace — /admin
 * Pushes live activity events to connected admin sockets.
 *
 * Events emitted:
 *   live_activity  — new order / user / payment activity item
 *   notification   — new admin notification
 */
import jwt from "jsonwebtoken";
import { getSocketServer } from "./socketServer.js";

const verifyOptions = {
  issuer:   process.env.JWT_ISSUER   || "agrovision-api",
  audience: process.env.JWT_AUDIENCE || "agrovision-client",
};

const authMiddleware = (socket, next) => {
  const token =
    socket.handshake?.auth?.token ||
    socket.handshake?.headers?.authorization?.replace("Bearer ", "");

  if (!token || !process.env.JWT_SECRET) return next(new Error("Authentication required"));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, verifyOptions);
    if (String(payload.role || "").toLowerCase() !== "admin") {
      return next(new Error("Admin access required"));
    }
    socket.data.userId = String(payload.id);
    return next();
  } catch {
    return next(new Error("Invalid or expired token"));
  }
};

export const registerAdminNamespace = (io) => {
  const admin = io.of("/admin");
  admin.use(authMiddleware);

  admin.on("connection", (socket) => {
    socket.join("admins");
  });
};

/**
 * Push a live activity item to all connected admins.
 * @param {{ type: string, message: string, time: string }} item
 */
export const emitAdminActivity = (item) => {
  const io = getSocketServer();
  if (!io) return;
  io.of("/admin").to("admins").emit("live_activity", {
    ...item,
    emittedAt: new Date().toISOString(),
  });
};

/**
 * Push a notification to all connected admins.
 * @param {object} notification
 */
export const emitAdminNotification = (notification) => {
  const io = getSocketServer();
  if (!io) return;
  io.of("/admin").to("admins").emit("notification", {
    ...notification,
    emittedAt: new Date().toISOString(),
  });
};
