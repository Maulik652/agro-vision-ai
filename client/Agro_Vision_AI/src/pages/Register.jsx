import React, { useState } from "react";
import {
  User, Mail, Phone, Lock, MapPin, Leaf,
  ShoppingCart, GraduationCap, Eye, EyeOff
} from "lucide-react";

import api from "../api/axios";
import { showSuccess, showError, showWarning } from "../utils/toastConfig";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState("Farmer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

    setForm({
      ...form,
      [name]: name === "email" ? value.toLowerCase() : value
    });
  };

  const isValid =
    form.name &&
    form.email &&
    form.phone &&
    form.password &&
    form.state &&
    form.city;

  const handleSubmit = async () => {

    if (!isValid) {
      showWarning("Please fill all required fields");
      return;
    }

    try {

      setLoading(true);

      const res = await api.post("/auth/register", { ...form, role });

      showSuccess("Registration successful");

      window.scrollTo({ top: 0, behavior: "smooth" });

      navigate("/login");

    }
    catch (error) {

      showError(error.response?.data?.message || "Registration failed");

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

          {/* Role selector */}
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
            {roles.map((r) => {
              const Icon = r.icon;

              return (
                <button
                  key={r.name}
                  onClick={() => setRole(r.name)}
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

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <Input icon={User} name="name" value={form.name} onChange={handleChange} placeholder="Full name" />
            <Input icon={Mail} name="email" value={form.email} onChange={handleChange} placeholder="Email address" />
            <Input icon={Phone} name="phone" value={form.phone} onChange={handleChange} placeholder="Phone number" />

            <PasswordInput
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              value={form.password}
              onChange={handleChange}
            />

            <Input icon={MapPin} name="state" value={form.state} onChange={handleChange} placeholder="State" />
            <Input icon={MapPin} name="city" value={form.city} onChange={handleChange} placeholder="City" />

            {role === "Farmer" && (
              <>
                <Input icon={Leaf} name="farmSize" value={form.farmSize} onChange={handleChange} placeholder="Farm size (acres)" />
                <Input icon={Leaf} name="crops" value={form.crops} onChange={handleChange} placeholder="Crop types" />
              </>
            )}

            {role === "Buyer" && (
              <>
                <Input icon={ShoppingCart} name="company" value={form.company} onChange={handleChange} placeholder="Company name" />
                <Input icon={ShoppingCart} name="license" value={form.license} onChange={handleChange} placeholder="License number" />
              </>
            )}

            {role === "Expert" && (
              <>
                <Input icon={GraduationCap} name="qualification" value={form.qualification} onChange={handleChange} placeholder="Qualification" />
                <Input icon={GraduationCap} name="experience" value={form.experience} onChange={handleChange} placeholder="Experience (years)" />
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

const Input = ({ icon: Icon, placeholder, name, value, onChange }) => (
  <div className="relative">
    <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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

const PasswordInput = ({ showPassword, setShowPassword, value, onChange }) => (
  <div className="relative">
    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      type={showPassword ? "text" : "password"}
      name="password"
      value={value}
      onChange={onChange}
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
);

export default Register;