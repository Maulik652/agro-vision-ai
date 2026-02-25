import axios from "axios";

/* CREATE INSTANCE */
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000, // 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});


/* REQUEST INTERCEPTOR */
api.interceptors.request.use(

  (config) => {

    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;

  },

  (error) => {
    return Promise.reject(error);
  }

);


/* RESPONSE INTERCEPTOR */
api.interceptors.response.use(

  (response) => response,

  (error) => {

    if (error.response) {

      /* TOKEN EXPIRED OR INVALID */
      if (error.response.status === 401) {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "/login";

      }

      /* SERVER ERROR */
      if (error.response.status === 500) {

        console.error("Server error:", error.response.data);

      }

    }

    /* NETWORK ERROR */
    else if (error.request) {

      console.error("Network error:", error.message);

    }

    return Promise.reject(error);

  }

);

export default api;