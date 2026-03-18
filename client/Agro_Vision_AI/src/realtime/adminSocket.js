import { io } from "socket.io-client";

const resolveSocketUrl = () => {
  const explicit = String(import.meta.env.VITE_SOCKET_URL || "").trim();
  if (explicit) return explicit;
  const api = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (api) return api.replace(/\/api\/?$/, "");
  return "http://localhost:5000";
};

/**
 * Connect to the /admin Socket.IO namespace.
 * Caller must disconnect on unmount.
 */
export const connectAdminSocket = (token) =>
  io(`${resolveSocketUrl()}/admin`, {
    transports: ["websocket"],
    withCredentials: true,
    auth: token ? { token } : undefined,
  });
