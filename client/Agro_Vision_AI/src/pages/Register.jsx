import React, { useState } from "react";
import {
  User, Mail, Phone, Lock, MapPin, Leaf,
  ShoppingCart, GraduationCap, Eye, EyeOff
} from "lucide-react";

import api from "../api/axios";
import { showSuccess, showError, showWarning } from "../utils/toastConfig";
import { getApiErrorMessages, getApiFieldErrors } from "../utils/apiError";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState("Farmer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "",
    state: "", city: "", farmSize: "", crops: "",
    company: "", license: "", qualification: "", experience: ""
  });

  const roles = [
    { name: "Farmer", icon: Leaf },
    { name: "Buyer", icon: ShoppingCart },
    { name: "Expert", icon: GraduationCap }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "email" ? value.toLowerCase() : value
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: ""
    }));

    setFormError("");
  };

  const isValid =
    form.name &&
    form.email &&
    form.phone &&
    form.password &&
    form.state &&
    form.city;

  const buildClientValidationErrors = () => {
    const errors = {};

    if (!form.name) errors.name = "Full name is required";
    if (!form.email) errors.email = "Email is required";
    if (!form.phone) errors.phone = "Phone number is required";
    if (!form.password) errors.password = "Password is required";
    if (!form.state) errors.state = "State is required";
    if (!form.city) errors.city = "City is required";

    if (role === "Farmer") {
      if (!form.farmSize) errors.farmSize = "Farm size is required";
      if (!form.crops) errors.crops = "Crop details are required";
    }

    if (role === "Buyer") {
      if (!form.company) errors.company = "Company name is required";
      if (!form.license) errors.license = "License number is required";
    }

    if (role === "Expert") {
      if (!form.qualification) errors.qualification = "Qualification is required";
      if (!form.experience) errors.experience = "Experience is required";
    }

    return errors;
  };

  const handleSubmit = async () => {

    const clientErrors = buildClientValidationErrors();

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      showWarning("Please fill all required details");
      return;
    }

    try {

      setLoading(true);
      setFieldErrors({});
      setFormError("");

      await api.post("/auth/register", {
        ...form,
        role: role.toLowerCase()
      });

      showSuccess("Registration successful");

      window.scrollTo({ top: 0, behavior: "smooth" });

      navigate("/login");

    }
    catch (error) {

      const messages = getApiErrorMessages(error, "Registration failed");
      const apiFieldErrors = getApiFieldErrors(error);
      const { _form, ...restFieldErrors } = apiFieldErrors;

      if (Object.keys(restFieldErrors).length > 0) {
        setFieldErrors((prev) => ({
          ...prev,
          ...restFieldErrors
        }));
      }

      setFormError(_form || messages[0]);
      showError(messages[0]);

      if (messages.length > 1) {
        showWarning(`Please fix ${messages.length} validation issues.`);
      }

      console.error("Register error:", error);

    }
    finally {

      setLoading(false);

    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-green-50 to-slate-100 px-4 py-6 overflow-x-hidden">
      <div className="w-full max-w-5xl grid md:grid-cols-2 bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-200">

        {/* Left info panel */}
        <div
          className="hidden md:flex flex-col justify-center text-white p-12"
          style={{ background: "linear-gradient(135deg, #14532D, #0f3d21)" }}
        >
          <h1 className="text-4xl font-bold mb-4">AgroVision AI</h1>
          <p className="text-green-100 text-lg leading-relaxed">
            Smart agriculture powered by AI. Detect diseases, connect with buyers, and increase productivity.
          </p>
        </div>

        {/* Right form panel */}
        <div className="p-8 md:p-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            Create your account
          </h2>

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">
              {formError}
            </div>
          )}

          {/* Role selector */}
          <div
            className={`flex gap-2 mb-2 bg-slate-100 p-1 rounded-xl border ${
              fieldErrors.role ? "border-red-300" : "border-transparent"
            }`}
          >
            {roles.map((r) => {
              const Icon = r.icon;

              return (
                <button
                  type="button"
                  key={r.name}
                  onClick={() => {
                    setRole(r.name);
                    setFieldErrors((prev) => ({
                      ...prev,
                      role: "",
                    }));
                    setFormError("");
                  }}
                  className={`flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-sm font-medium transition
                  ${role === r.name
                    ? "bg-white shadow text-green-700"
                    : "text-slate-600 hover:text-green-600"
                  }`}
                >
                  <Icon size={16} />
                  {r.name}
                </button>
              );
            })}
          </div>

          {fieldErrors.role && (
            <p className="text-xs text-red-600 mb-4">{fieldErrors.role}</p>
          )}

          {!fieldErrors.role && <div className="mb-6" />}

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <Input icon={User} name="name" value={form.name} onChange={handleChange} placeholder="Full name" error={fieldErrors.name} />
            <Input icon={Mail} type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email address" error={fieldErrors.email} />
            <Input icon={Phone} name="phone" value={form.phone} onChange={handleChange} placeholder="Phone number" error={fieldErrors.phone} />

            <PasswordInput
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              value={form.password}
              onChange={handleChange}
              error={fieldErrors.password}
            />

            <Input icon={MapPin} name="state" value={form.state} onChange={handleChange} placeholder="State" error={fieldErrors.state} />
            <Input icon={MapPin} name="city" value={form.city} onChange={handleChange} placeholder="City" error={fieldErrors.city} />

            {role === "Farmer" && (
              <>
                <Input icon={Leaf} type="number" name="farmSize" value={form.farmSize} onChange={handleChange} placeholder="Farm size (acres)" error={fieldErrors.farmSize} />
                <Input icon={Leaf} name="crops" value={form.crops} onChange={handleChange} placeholder="Crop types" error={fieldErrors.crops} />
              </>
            )}

            {role === "Buyer" && (
              <>
                <Input icon={ShoppingCart} name="company" value={form.company} onChange={handleChange} placeholder="Company name" error={fieldErrors.company} />
                <Input icon={ShoppingCart} name="license" value={form.license} onChange={handleChange} placeholder="License number" error={fieldErrors.license} />
              </>
            )}

            {role === "Expert" && (
              <>
                <Input icon={GraduationCap} name="qualification" value={form.qualification} onChange={handleChange} placeholder="Qualification" error={fieldErrors.qualification} />
                <Input icon={GraduationCap} type="number" name="experience" value={form.experience} onChange={handleChange} placeholder="Experience (years)" error={fieldErrors.experience} />
              </>
            )}

          </div>

          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className={`w-full mt-6 py-3 rounded-xl font-semibold transition
            ${isValid
              ? "bg-[#14532D] text-white hover:opacity-90"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {loading ? "Creating..." : "Create account"}
          </button>

          <p className="text-sm text-center mt-4 text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-[#14532D] hover:underline">
              Login
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
      <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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

const PasswordInput = ({ showPassword, setShowPassword, value, onChange, error }) => (
  <div>
    <div className="relative">
      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type={showPassword ? "text" : "password"}
        name="password"
        value={value}
        onChange={onChange}
        placeholder="Password"
        className={`w-full pl-10 pr-10 py-3 border rounded-xl
        focus:outline-none focus:ring-2 transition
        ${error
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

    {error && (
      <p className="text-xs text-red-600 mt-1">{error}</p>
    )}
  </div>
);

export default Register;