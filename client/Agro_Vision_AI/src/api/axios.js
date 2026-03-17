import axios from "axios";

/* CREATE INSTANCE */
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/* REQUEST INTERCEPTOR */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/* RESPONSE INTERCEPTOR */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const requestUrl = error.config?.url || "";
      const isAuthEndpoint =
        requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register");

      // Account status enforcement — force logout with reason
      if (status === 403 && !isAuthEndpoint) {
        const code = data?.code;
        const ACCOUNT_CODES = ["ACCOUNT_BLOCKED", "ACCOUNT_SUSPENDED", "ACCOUNT_DELETED"];
        if (ACCOUNT_CODES.includes(code)) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          // Store reason so Login page can display it
          localStorage.setItem("auth_error", JSON.stringify({ code, message: data.message }));
          window.location.href = "/login";
          return Promise.reject(error);
        }
      }

      // Token expired / invalid
      if (status === 401 && !isAuthEndpoint) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }

      if (status === 500) {
        console.error("Server error:", data);
      }
    } else if (error.request) {
      console.error("Network error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
