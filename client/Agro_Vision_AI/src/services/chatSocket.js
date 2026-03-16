/**
 * Chat Socket Client — AgroVision AI
 * Manages the Socket.IO /chat namespace connection.
 *
 * Singleton pattern: one socket instance shared across the app.
 * Connect once on login, disconnect on logout.
 */
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;

export const connectChatSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(`${SOCKET_URL}/chat`, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  return socket;
};

export const disconnectChatSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getChatSocket = () => socket;
