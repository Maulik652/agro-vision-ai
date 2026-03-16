import { io } from "socket.io-client";

const resolveSocketUrl = () => {
  const explicitSocketUrl = String(import.meta.env.VITE_SOCKET_URL || "").trim();
  if (explicitSocketUrl) {
    return explicitSocketUrl;
  }

  const explicitApiBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (explicitApiBase) {
    return explicitApiBase.replace(/\/api\/?$/, "");
  }

  return "http://localhost:5000";
};

/**
 * Open a Socket.IO connection scoped to a single crop detail page.
 * The caller is responsible for disconnecting the returned socket on unmount.
 *
 * @param {string} token  JWT access token
 * @returns {import("socket.io-client").Socket}
 */
export const connectCropDetailSocket = (token) =>
  io(resolveSocketUrl(), {
    transports: ["websocket"],
    withCredentials: true,
    auth: token ? { token } : undefined
  });
