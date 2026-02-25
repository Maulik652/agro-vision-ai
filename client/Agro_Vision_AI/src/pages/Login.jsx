import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import api from "../api/axios";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ✅ Custom Toast */
import { showSuccess, showError, showWarning } from "../utils/toastConfig";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]:
        type === "checkbox"
          ? checked
          : name === "email"
          ? value.toLowerCase()
          : value,
    });
  };

  const isValid = form.email && form.password;

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      showWarning("Email and password are required");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });

      const { token, user } = res.data;

      /* ✅ Save Auth */
      login(user, token);

      showSuccess("Login successful");

      /* ✅ Smooth UX */
      window.scrollTo({ top: 0, behavior: "smooth" });

      const role = user.role?.toLowerCase();

      if (role === "farmer") {
        navigate("/farmer/dashboard");
      } else if (role === "buyer") {
        navigate("/buyer/dashboard");
      } else if (role === "expert") {
        navigate("/expert/dashboard");
      } else if (role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      showError(error.response?.data?.message || "Login failed");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-green-50 to-slate-100 px-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-slate-200">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Welcome Back
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Login to continue to AgroVision AI
          </p>
        </div>

        <div className="space-y-4">
          
          <Input
            icon={Mail}
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email address"
          />

          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={handleChange}
                className="accent-green-700"
              />
              Remember me
            </label>

            <Link
              to="/forgot-password"
              className="text-green-700 font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            onClick={handleLogin}
            disabled={!isValid || loading}
            className={`w-full py-3 rounded-xl font-semibold transition
              ${
                isValid
                  ? "bg-[#14532D] text-white hover:opacity-90"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs text-slate-400">OR</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="border border-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
              Google
            </button>
            <button className="border border-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
              Apple
            </button>
          </div>

          <p className="text-sm text-center text-slate-600 pt-4">
            Don’t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-green-700 hover:underline"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const Input = ({ icon: Icon, placeholder, name, value, onChange }) => (
  <div className="relative">
    <Icon
      size={18}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
    />
    <input
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl
      focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition"
    />
  </div>
);

export default Login;