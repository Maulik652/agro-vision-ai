import React, { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import api from "../api/axios";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessages, getApiFieldErrors } from "../utils/apiError";

/* ✅ Custom Toast */
import { showSuccess, showError, showWarning } from "../utils/toastConfig";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [accountBanner, setAccountBanner] = useState(null); // { code, message }

  // Read forced-logout reason set by axios interceptor
  useEffect(() => {
    const stored = localStorage.getItem("auth_error");
    if (stored) {
      try { setAccountBanner(JSON.parse(stored)); } catch { /* ignore */ }
      localStorage.removeItem("auth_error");
    }
  }, []);

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "email"
          ? value.toLowerCase()
          : value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setFormError("");
  };

  const isValid = form.email && form.password;

  const handleLogin = async () => {
    const clientErrors = {};

    if (!form.email) {
      clientErrors.email = "Email is required";
    }

    if (!form.password) {
      clientErrors.password = "Password is required";
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      showWarning("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      setFieldErrors({});
      setFormError("");

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
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error) {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;
      const serverMsg = error?.response?.data?.message;

      // Account blocked / suspended / deleted — show prominent banner
      if (status === 403 && code) {
        setAccountBanner({ code, message: serverMsg });
        return;
      }

      const messages = getApiErrorMessages(error, "Login failed");
      const apiFieldErrors = getApiFieldErrors(error);
      const { _form, ...restFieldErrors } = apiFieldErrors;

      if (Object.keys(restFieldErrors).length > 0) {
        setFieldErrors((prev) => ({
          ...prev,
          ...restFieldErrors,
        }));
      }

      setFormError(_form || messages[0]);
      showError(messages[0]);

      if (messages.length > 1) {
        showWarning(`Please fix ${messages.length} validation issues.`);
      }

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

          {/* Account blocked / suspended / deleted banner */}
          {accountBanner && (
            <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
              <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {accountBanner.code === "ACCOUNT_DELETED" ? "Account Removed" :
                   accountBanner.code === "ACCOUNT_BLOCKED" ? "Account Blocked" : "Account Suspended"}
                </p>
                <p className="text-xs text-red-600 mt-0.5">{accountBanner.message}</p>
              </div>
            </div>
          )}

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          
          <Input
            icon={Mail}
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email address"
            error={fieldErrors.email}
          />

          <div>
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
                className={`w-full pl-10 pr-10 py-3 border rounded-xl
                focus:outline-none focus:ring-2 transition
                ${fieldErrors.password
                  ? "border-red-400 focus:ring-red-500/20 focus:border-red-500"
                  : "border-slate-300 focus:ring-green-500/30 focus:border-green-500"
                }`}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {fieldErrors.password && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
            )}
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

const Input = ({ icon: Icon, placeholder, name, value, onChange, error, type = "text" }) => (
  <div>
    <div className="relative">
      <Icon
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full pl-10 pr-3 py-3 border rounded-xl
        focus:outline-none focus:ring-2 transition
        ${error
          ? "border-red-400 focus:ring-red-500/20 focus:border-red-500"
          : "border-slate-300 focus:ring-green-500/30 focus:border-green-500"
        }`}
      />
    </div>

    {error && (
      <p className="text-xs text-red-600 mt-1">{error}</p>
    )}
  </div>
);

export default Login;