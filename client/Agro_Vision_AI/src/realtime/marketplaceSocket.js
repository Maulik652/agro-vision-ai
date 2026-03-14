import { io } from "socket.io-client";

const resolveSocketUrl = () => {
  const explicitSocketUrl = String(import.meta.env.VITE_SOCKET_URL || "").trim();
  if (explicitSocketUrl) {
    return explicitSocketUrl;
  }

  const explicitApiUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (explicitApiUrl) {
    return explicitApiUrl.replace(/\/api\/?$/, "");
  }

  return "http://localhost:5000";
};

export const connectMarketplaceSocket = (token) =>
  io(resolveSocketUrl(), {
    transports: ["websocket"],
    withCredentials: true,
    auth: token ? { token } : undefined
  });
