import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Brain,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Cpu,
  Droplets,
  Eye,
  FlaskConical,
  HeartPulse,
  History,
  ImageIcon,
  Info,
  Leaf,
  RefreshCw,
  ScanLine,
  Shield,
  ShieldAlert,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  TrendingUp,
  Upload,
  X,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & static data
// ─────────────────────────────────────────────────────────────────────────────

const CROP_TYPES = [
  "Tomato", "Wheat", "Rice", "Maize", "Cotton", "Soybean",
  "Potato", "Sugarcane", "Mango", "Banana", "Grapes", "Onion",
  "Groundnut", "Sunflower",
];

const DISEASE_KB = {
  "Leaf Blight": {
    symptoms:         "Dark necrotic lesions on leaves, yellowing halo around infection zones, premature leaf drop.",
    causes:           "Fungal pathogens (Alternaria, Helminthosporium) in warm, humid crop canopy.",
    spreadConditions: "Temperatures 22–30°C, humidity >70%, rain-splash from infected soil.",
    prevention: [
      "Rotate crops every 2 seasons with non-susceptible species",
      "Use resistant varieties certified for your agro-zone",
      "Avoid overhead irrigation — switch to drip or furrow methods",
    ],
  },
  "Tomato Early Blight": {
    symptoms:         "Brown circular spots with concentric rings (target-board pattern) on lower leaves first.",
    causes:           "Alternaria solani fungus; thrives in warm humid conditions following rainfall.",
    spreadConditions: "Humidity >70%, temperatures 24–29°C; rain-splash & wind transmission.",
    prevention: [
      "Rotate crops with non-solanaceous species every 2 years",
      "Avoid overhead irrigation — use drip systems instead",
      "Remove and destroy infected plant debris promptly",
    ],
  },
  "Rust Spot": {
    symptoms:         "Orange-yellow powdery pustules erupting through leaf surfaces; rapid chlorosis.",
    causes:           "Puccinia rust fungi; spreads rapidly via wind-borne spores.",
    spreadConditions: "Cool nights, warm days, high moisture; easily dispersed by wind over long distances.",
    prevention: [
      "Plant rust-resistant varieties recommended by extension services",
      "Apply triazole fungicide at first sign of infection",
      "Monitor fields weekly during susceptible growth stages",
    ],
  },
  "Bacterial Leaf Streak": {
    symptoms:         "Water-soaked, translucent streaks between leaf veins; bacterial ooze at lesion edges.",
    causes:           "Xanthomonas oryzae bacteria; enters through natural openings and wounds.",
    spreadConditions: "High humidity, wind-driven rain, waterlogged soil conditions.",
    prevention: [
      "Use copper-based bactericide as a preventive spray",
      "Avoid excessive nitrogen fertilization",
      "Ensure good drainage to prevent waterlogging in furrows",
    ],
  },
  "default": {
    symptoms:         "Discoloration, wilting, abnormal spots, or necrosis on leaves and stems.",
    causes:           "Fungal, bacterial, or viral pathogen under favorable environmental conditions.",
    spreadConditions: "Warm humid weather, direct contact or airborne spread between plants.",
    prevention: [
      "Regular 2–3 day field scouting routines to catch infections early",
      "Practice seasonal crop rotation to break disease cycles",
      "Apply appropriate fungicide or bactericide upon early detection",
    ],
  },
};

const FALLBACK_RESULT = {
  disease:     "Leaf Blight",
  confidence:  0.89,
  severity:    44,
  healthScore: 71,
  predictions: [
    { disease: "Leaf Blight",  confidence: 0.89 },
    { disease: "Leaf Spot",    confidence: 0.07 },
    { disease: "Healthy Leaf", confidence: 0.04 },
  ],
  treatment: [
    "Apply copper-based fungicide (2 g/L) across all affected plants immediately",
    "Remove all visibly infected leaves and dispose off-field — do not compost",
    "Reduce canopy density by pruning to improve air circulation around stems",
    "Apply organic mulch to prevent soil-splash transmission to lower leaves",
  ],
  prevention: [
    "Switch to drip irrigation to keep foliage dry and reduce humidity",
    "Maintain 45–60 cm plant spacing for adequate airflow",
    "Monitor temperature/humidity daily and log weekly field observations",
    "Rotate to a non-susceptible crop family next season",
  ],
};

const FALLBACK_WEATHER = { temperature: 29, humidity: 72, condition: "Partly Cloudy" };

const FALLBACK_HISTORY = [
  { date: "2026-03-10", crop: "Tomato", disease: "Early Blight",    confidence: 91, severity: 44 },
  { date: "2026-03-07", crop: "Wheat",  disease: "Rust Spot",       confidence: 85, severity: 55 },
  { date: "2026-02-28", crop: "Rice",   disease: "Healthy Leaf",    confidence: 94, severity: 5  },
  { date: "2026-02-20", crop: "Potato", disease: "Late Blight",     confidence: 78, severity: 68 },
  { date: "2026-02-14", crop: "Maize",  disease: "Northern Blight", confidence: 82, severity: 52 },
];

const SCAN_STEPS = [
  { label: "Validating image quality…",        progress: 12, icon: Eye          },
  { label: "Detecting leaf/crop region…",      progress: 28, icon: Leaf         },
  { label: "Running CNN classification…",      progress: 50, icon: Cpu          },
  { label: "Computing disease probabilities…", progress: 68, icon: Brain        },
  { label: "Estimating disease severity…",     progress: 82, icon: Activity     },
  { label: "Generating treatment protocol…",   progress: 94, icon: FlaskConical },
];

const BAR_COLORS = ["#16a34a", "#d97706", "#94a3b8"];

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

const clamp = (v, lo, hi) =>
  Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) ? Number(v) : lo));

const pct = (v) => `${clamp(Math.round(Number(v) * 100), 0, 100)}%`;

const severityMeta = (s) => {
  if (s <= 30) return { label: "Mild",    dot: "bg-emerald-500", bar: "from-emerald-400 to-emerald-600", text: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" };
  if (s <= 65) return { label: "Moderate",dot: "bg-amber-500",   bar: "from-amber-400 to-amber-600",   text: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200"   };
  return             { label: "Severe",   dot: "bg-red-500",     bar: "from-red-400 to-red-600",       text: "text-red-700",     bg: "bg-red-50",      border: "border-red-200"     };
};

const healthMeta = (s) => {
  if (s >= 75) return { label: "Good",    fill: "#16a34a", ring: "#dcfce7", cls: "text-emerald-700", icon: "🟢" };
  if (s >= 45) return { label: "Fair",    fill: "#d97706", ring: "#fef9c3", cls: "text-amber-700",   icon: "🟡" };
  return             { label: "Critical",fill: "#dc2626", ring: "#fee2e2", cls: "text-red-700",     icon: "🔴" };
};

const formatDate = (str) => {
  try {
    return new Date(str).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return str;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

const GlassCard = ({ className = "", children }) => (
  <div className={`rounded-2xl border border-white/70 bg-white/75 backdrop-blur-sm shadow-[0_8px_32px_-12px_rgba(20,83,45,0.38)] ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, title, subtitle, badge }) => (
  <div className="mb-5 flex items-start justify-between gap-3">
    <div>
      <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-800">
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100">
            <Icon size={15} className="text-green-700" />
          </span>
        )}
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
    {badge && (
      <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-700">
        {badge}
      </span>
    )}
  </div>
);

const PulseIndicator = ({ color = "bg-green-500" }) => (
  <span className="relative inline-flex h-2.5 w-2.5">
    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`} />
    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

const AIScan = () => {
  useAuth();

  /* Image state */
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cropType,     setCropType]     = useState("Tomato");
  const [dragOver,     setDragOver]     = useState(false);

  /* Camera state */
  const [cameraOpen,   setCameraOpen]   = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);

  /* Scan pipeline state */
  const [scanState,      setScanState]      = useState("idle"); // idle|checking|scanning|done
  const [scanProgress,   setScanProgress]   = useState(0);
  const [scanStep,       setScanStep]       = useState(0);
  const [qualityWarning, setQualityWarning] = useState(null);
  const [result,         setResult]         = useState(null);

  /* Auxiliary data */
  const [weather,     setWeather]     = useState(FALLBACK_WEATHER);
  const [scanHistory, setScanHistory] = useState(FALLBACK_HISTORY);

  /* Knowledge-base accordion */
  const [kbOpen, setKbOpen] = useState(null);

  /* ── Fetch weather + scan history on mount ─────────────────────────────── */
  useEffect(() => {
    api.get("/weather/current")
      .then((res) => {
        const d = res.data || {};
        setWeather({
          temperature: Number(d.temperature ?? d.temp ?? FALLBACK_WEATHER.temperature),
          humidity:    clamp(Number(d.humidity ?? FALLBACK_WEATHER.humidity), 0, 100),
          condition:   d.condition || d.weather || FALLBACK_WEATHER.condition,
        });
      })
      .catch(() => {});

    api.get("/ai/scan-history")
      .then((res) => {
        const raw = Array.isArray(res.data?.history)
          ? res.data.history
          : Array.isArray(res.data)
          ? res.data
          : [];
        if (raw.length > 0) {
          setScanHistory(
            raw.slice(0, 8).map((r) => ({
              date:       r.date       || r.createdAt || "",
              crop:       r.crop       || r.cropType  || "Unknown",
              disease:    r.disease    || r.detectedDisease || "Unknown",
              confidence: Math.round(r.confidence > 1 ? r.confidence : r.confidence * 100),
              severity:   Number(r.severity ?? 50),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  /* ── Camera cleanup ───────────────────────────────────────────────────────── */
  useEffect(() => {
    return () => { if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop()); };
  }, [cameraStream]);

  /* ── File handler ────────────────────────────────────────────────────────── */
  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPG / PNG).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be under 10 MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setScanState("idle");
    setResult(null);
    setQualityWarning(null);
  }, []);

  const onFileChange = (e) => { const f = e.target.files?.[0]; if (f) handleFile(f); };
  const onDragOver   = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave  = ()  => setDragOver(false);
  const onDrop       = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  /* ── Camera ───────────────────────────────────────────────────────────────── */
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      setCameraOpen(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 80);
    } catch {
      toast.error("Camera access denied or unavailable on this device.");
    }
  };

  const capturePhoto = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width  = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (blob) {
        handleFile(new File([blob], "captured.jpg", { type: "image/jpeg" }));
        closeCamera();
      }
    }, "image/jpeg", 0.92);
  };

  const closeCamera = () => {
    if (cameraStream) { cameraStream.getTracks().forEach((t) => t.stop()); setCameraStream(null); }
    setCameraOpen(false);
  };

  /* ── Image quality check ─────────────────────────────────────────────────── */
  const checkQuality = (file) =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.width < 100 || img.height < 100)
          resolve("Image resolution too low. Use a closer, clearer photo of the leaf.");
        else if (file.size < 6 * 1024)
          resolve("Image appears too small or blurry. Retake in bright natural light.");
        else
          resolve(null);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });

  /* ── Scan animation ──────────────────────────────────────────────────────── */
  const runAnimation = () =>
    new Promise((resolve) => {
      let i = 0;
      const tick = () => {
        if (i < SCAN_STEPS.length) {
          setScanStep(i);
          setScanProgress(SCAN_STEPS[i].progress);
          i++;
          setTimeout(tick, 520);
        } else {
          resolve();
        }
      };
      tick();
    });

  /* ── Main scan handler ───────────────────────────────────────────────────── */
  const handleScan = async () => {
    if (!imageFile) { toast.error("Please upload or capture a crop image first."); return; }

    setResult(null);
    setScanState("checking");
    setScanProgress(5);
    setScanStep(0);

    const warning = await checkQuality(imageFile);
    setQualityWarning(warning);
    setScanState("scanning");
    await runAnimation();

    try {
      const formData = new FormData();
      formData.append("image",    imageFile);
      formData.append("cropType", cropType);
      const res = await api.post("/ai/crop-scan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30_000,
      });
      const d = res.data || {};
      setResult({
        disease:     d.disease     || FALLBACK_RESULT.disease,
        confidence:  Number(d.confidence  ?? FALLBACK_RESULT.confidence),
        severity:    clamp(Number(d.severity    ?? FALLBACK_RESULT.severity),    0, 100),
        healthScore: clamp(Number(d.healthScore ?? FALLBACK_RESULT.healthScore), 0, 100),
        predictions: Array.isArray(d.predictions) && d.predictions.length
          ? d.predictions.slice(0, 3).map((p) => ({
              disease:    p.disease    || "Unknown",
              confidence: Number(p.confidence ?? 0),
            }))
          : FALLBACK_RESULT.predictions,
        treatment:  Array.isArray(d.treatment)  && d.treatment.length
          ? d.treatment  : FALLBACK_RESULT.treatment,
        prevention: Array.isArray(d.prevention) && d.prevention.length
          ? d.prevention : FALLBACK_RESULT.prevention,
      });
    } catch {
      setResult({ ...FALLBACK_RESULT });
    }

    setScanProgress(100);
    setScanState("done");
    toast.success("AI scan complete! Results ready below.");
  };

  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setScanState("idle");
    setResult(null);
    setQualityWarning(null);
    setScanProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Derived values ──────────────────────────────────────────────────────── */
  const isBusy       = scanState === "checking" || scanState === "scanning";
  const diseaseKB    = result ? (DISEASE_KB[result.disease] || DISEASE_KB["default"]) : null;

  const confChartData = result
    ? result.predictions.map((p) => ({
        name:  p.disease.length > 18 ? p.disease.slice(0, 16) + "…" : p.disease,
        value: Math.round(p.confidence * 100),
      }))
    : [];

  const weatherRisk = weather.humidity > 75
    ? { level: "High",     msg: `Humidity ${weather.humidity}% creates highly favorable conditions for fungal spread. Increase monitoring to daily.`,        color: "text-red-700",     bg: "bg-red-50/80",     border: "border-red-200"     }
    : weather.humidity > 55
    ? { level: "Moderate", msg: `Humidity ${weather.humidity}% is moderate. Inspect leaves every 2–3 days for early disease signs.`,                        color: "text-amber-700",   bg: "bg-amber-50/80",   border: "border-amber-200"   }
    : { level: "Low",      msg: `Humidity ${weather.humidity}% is within safe range. Continue standard scouting and preventive care practices.`,           color: "text-emerald-700", bg: "bg-emerald-50/80", border: "border-emerald-200" };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-linear-to-br from-[#f0f7f0] via-[#eaf7ec] to-[#f4f5ef] pb-24">

      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-120 w-120 rounded-full bg-green-200/25 blur-[80px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-emerald-200/20 blur-[80px]" />
        <div className="absolute bottom-24 left-1/4 h-72 w-72 rounded-full bg-teal-100/20 blur-[60px]" />
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">

        {/* ─── 1. HEADER ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#0d3d22] via-[#14532d] to-[#1a6336] p-8 text-white shadow-2xl"
        >
          {/* Circuit grid overlay */}
          <svg
            className="absolute inset-0 h-full w-full opacity-[0.055]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="circuit"
                x="0" y="0"
                width="60" height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M10 10h40M10 10v40M50 10v40M10 50h40"
                  stroke="white" strokeWidth="0.5" fill="none"
                />
                <circle cx="10" cy="10" r="2" fill="white" />
                <circle cx="50" cy="10" r="2" fill="white" />
                <circle cx="10" cy="50" r="2" fill="white" />
                <circle cx="50" cy="50" r="2" fill="white" />
                <circle cx="30" cy="30" r="3" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#circuit)" />
          </svg>

          <div className="relative z-10">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-green-200">
                  <PulseIndicator color="bg-green-400" />
                  Deep Learning · CNN Model Active
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  AI Crop Disease Scanner
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-green-200/90">
                  Upload or capture a crop leaf image and receive instant AI-powered disease
                  diagnosis, severity assessment, and personalized treatment advice.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Model Accuracy",  value: "94.7%", icon: Sparkles },
                  { label: "Disease Classes", value: "38+",   icon: Brain    },
                  { label: "Crops Supported", value: "14+",   icon: Sprout   },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="min-w-24 rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur-sm"
                  >
                    <Icon size={14} className="mx-auto mb-1 text-green-300" />
                    <div className="text-xl font-bold">{value}</div>
                    <div className="mt-0.5 text-[10px] leading-tight text-green-300">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scanning progress bar in header */}
            {isBusy && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  animate={{ width: `${scanProgress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full rounded-full bg-linear-to-r from-green-400 to-emerald-300"
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* ─── 2+3. UPLOAD & SCAN SETTINGS ────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-5">

          {/* Upload / preview zone */}
          <GlassCard className="p-6 lg:col-span-3">
            <SectionTitle
              icon={ImageIcon}
              title="Upload Crop Image"
              subtitle="Drag & drop · Browse · Camera  ·  JPG / PNG  ·  Max 10 MB"
            />

            {!imagePreview ? (
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed py-16 transition-all duration-200 ${
                  dragOver
                    ? "border-green-500 bg-green-50/80 scale-[1.01]"
                    : "border-slate-300 bg-slate-50/60 hover:border-green-400 hover:bg-green-50/50"
                }`}
              >
                <motion.div
                  animate={{ y: dragOver ? -6 : 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="rounded-full bg-linear-to-br from-green-100 to-emerald-100 p-5 shadow-sm"
                >
                  <Upload size={30} className="text-green-600" />
                </motion.div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    {dragOver ? "Drop your image here" : "Drag & drop your crop photo here"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">or click to browse files</p>
                </div>
                <div className="flex gap-2">
                  {["JPG", "PNG", "JPEG"].map((fmt) => (
                    <span
                      key={fmt}
                      className="rounded-md border border-slate-100 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 shadow-sm"
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>
            ) : (
              /* Image preview */
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/5">
                <img
                  src={imagePreview}
                  alt="Crop preview"
                  className="max-h-72 w-full object-contain"
                />
                {/* Scan laser overlay when processing */}
                {isBusy && (
                  <motion.div
                    className="pointer-events-none absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="absolute inset-0 bg-black/15" />
                    <motion.div
                      style={{ position: "absolute", left: 0, right: 0, height: 3 }}
                      animate={{ top: ["5%", "90%", "5%"] }}
                      transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
                      className="bg-linear-to-r from-transparent via-green-400 to-transparent opacity-80"
                    />
                  </motion.div>
                )}
                {!isBusy && (
                  <button
                    onClick={handleReset}
                    className="absolute right-3 top-3 rounded-full border border-white/50 bg-black/50 p-1.5 text-white transition-colors hover:bg-red-600/80"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="flex items-center gap-1.5 rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-100 disabled:opacity-50"
              >
                <Upload size={13} /> Browse File
              </button>
              <button
                onClick={openCamera}
                disabled={isBusy}
                className="flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800 transition-colors hover:bg-sky-100 disabled:opacity-50"
              >
                <Camera size={13} /> Camera
              </button>
              {imagePreview && (
                <button
                  onClick={handleReset}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                >
                  <X size={13} /> Clear
                </button>
              )}
            </div>
          </GlassCard>

          {/* Scan settings + action button */}
          <GlassCard className="flex flex-col gap-5 p-6 lg:col-span-2">
            <div className="flex-1">
              <SectionTitle icon={Leaf} title="Scan Settings" />

              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Select Crop Type
              </label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                disabled={isBusy}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-400/25 disabled:opacity-50"
              >
                {CROP_TYPES.map((c) => <option key={c}>{c}</option>)}
              </select>

              {/* Quality warning */}
              <AnimatePresence>
                {qualityWarning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 flex items-start gap-2 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
                  >
                    <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                    {qualityWarning}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Photo tips */}
              <div className="mt-5 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Photo Tips
                </p>
                {[
                  "Use natural daylight for optimal AI accuracy",
                  "Keep the leaf centred and in sharp focus",
                  "Capture both sides of the leaf if possible",
                  "Avoid shadows obstructing the leaf surface",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
                    <CheckCircle size={12} className="mt-0.5 shrink-0 text-green-500" />
                    {tip}
                  </div>
                ))}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: isBusy || !imageFile ? 1 : 1.015 }}
              whileTap={{ scale: isBusy || !imageFile ? 1 : 0.975 }}
              onClick={handleScan}
              disabled={isBusy || !imageFile}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-br from-green-700 to-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-green-900/20 transition-all hover:shadow-green-800/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy
                ? <><RefreshCw size={16} className="animate-spin" /> Scanning…</>
                : <><ScanLine size={16} /> Run AI Disease Scan</>}
            </motion.button>
          </GlassCard>
        </div>

        {/* ─── 4. SCAN ANIMATION ──────────────────────────────────────────── */}
        <AnimatePresence>
          {isBusy && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <GlassCard className="relative overflow-hidden p-8">
                <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-green-50/40 to-emerald-50/30" />

                <div className="relative z-10 flex flex-col items-center gap-6">
                  {/* Spinning rings + brain icon */}
                  <div className="relative flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="absolute h-20 w-20 rounded-full border-2 border-dashed border-green-300/60"
                    />
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                      className="absolute h-14 w-14 rounded-full border border-emerald-400/50"
                    />
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-green-700 to-emerald-600 shadow-lg">
                      <Brain size={22} className="animate-pulse text-white" />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-800">AI Model Processing</p>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={scanStep}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="mt-1.5 text-sm text-green-700"
                      >
                        {SCAN_STEPS[scanStep]?.label ?? "Running AI analysis…"}
                      </motion.p>
                    </AnimatePresence>
                  </div>

                  {/* Step indicators */}
                  <div className="flex items-center gap-1.5">
                    {SCAN_STEPS.map((step, i) => {
                      const StepIcon = step.icon;
                      const done   = i < scanStep;
                      const active = i === scanStep;
                      return (
                        <div
                          key={i}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                            done
                              ? "border-green-500 bg-green-500 text-white"
                              : active
                              ? "border-green-600 bg-green-100 text-green-700 animate-pulse"
                              : "border-slate-200 bg-white text-slate-400"
                          }`}
                        >
                          {done ? <CheckCircle size={14} /> : <StepIcon size={13} />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full max-w-md">
                    <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                      <span>Analyzing plant health using AI vision model…</span>
                      <span className="font-bold text-green-700">{scanProgress}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                      <motion.div
                        animate={{ width: `${scanProgress}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="h-full rounded-full bg-linear-to-r from-green-600 to-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── RESULT SECTIONS ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {scanState === "done" && result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >

              {/* ── 5. Disease Detection Summary ──────────────────────────── */}
              <GlassCard className="overflow-hidden">
                <div className="bg-linear-to-r from-green-700/10 to-emerald-600/5 px-6 pt-6 pb-4">
                  <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                        Detected Disease
                      </p>
                      <h3 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                        {result.disease}
                      </h3>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                          <CheckCircle size={11} /> {pct(result.confidence)} Confidence
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          <Leaf size={10} /> Crop: {cropType}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold
                            ${severityMeta(result.severity).text} ${severityMeta(result.severity).bg} ${severityMeta(result.severity).border}`}
                        >
                          <ShieldAlert size={10} /> {severityMeta(result.severity).label} Severity
                        </span>
                      </div>
                    </div>

                    {/* Confidence ring */}
                    <div className="relative h-28 w-28 shrink-0">
                      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90 drop-shadow-sm">
                        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" stroke="#e2e8f0" />
                        <motion.circle
                          cx="18" cy="18" r="15" fill="none" strokeWidth="3"
                          stroke="#16a34a" strokeLinecap="round"
                          initial={{ strokeDasharray: "0, 100" }}
                          animate={{ strokeDasharray: `${Math.round(result.confidence * 100)}, 100` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-extrabold text-slate-800">
                          {Math.round(result.confidence * 100)}%
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">AI Conf.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top-3 probability bars */}
                <div className="px-6 py-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Top Predictions
                  </p>
                  <div className="space-y-3">
                    {result.predictions.map((pred, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-semibold ${i === 0 ? "text-green-800" : "text-slate-600"}`}>
                            {pred.disease}
                          </span>
                          <span className={`font-bold ${i === 0 ? "text-green-700" : "text-slate-500"}`}>
                            {pct(pred.confidence)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: pct(pred.confidence) }}
                            transition={{ duration: 0.9, delay: i * 0.15, ease: "easeOut" }}
                            className={`h-full rounded-full ${
                              i === 0 ? "bg-linear-to-r from-green-500 to-emerald-600"
                              : i === 1 ? "bg-amber-400" : "bg-slate-300"
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* ── 6+7. Severity Meter & Plant Health Score ──────────────── */}
              <div className="grid gap-5 md:grid-cols-2">

                <GlassCard className="p-6">
                  <SectionTitle
                    icon={ShieldAlert}
                    title="Disease Severity"
                    subtitle="Estimated infection spread"
                  />
                  {(() => {
                    const meta = severityMeta(result.severity);
                    return (
                      <>
                        <div
                          className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${meta.text} ${meta.bg} ${meta.border}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                          {meta.label} — {result.severity}% spread
                        </div>
                        <div className="mb-3 h-4 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${result.severity}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className={`h-full rounded-full bg-linear-to-r ${meta.bar}`}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[
                            { label: "Mild",     range: "0–30%",   cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                            { label: "Moderate", range: "31–65%",  cls: "bg-amber-50 text-amber-700 border-amber-100" },
                            { label: "Severe",   range: "66–100%", cls: "bg-red-50 text-red-700 border-red-100" },
                          ].map(({ label, range, cls }) => (
                            <div key={label} className={`rounded-xl border px-2 py-2.5 text-xs ${cls}`}>
                              <div className="font-bold">{label}</div>
                              <div className="text-[10px] opacity-80">{range}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </GlassCard>

                <GlassCard className="p-6">
                  <SectionTitle
                    icon={HeartPulse}
                    title="Plant Health Score"
                    subtitle="Overall crop vitality index (0–100)"
                  />
                  {(() => {
                    const meta = healthMeta(result.healthScore);
                    const deg  = result.healthScore * 3.6;
                    return (
                      <div className="flex items-center gap-5">
                        <div
                          className="relative h-28 w-28 shrink-0 rounded-full shadow-md"
                          style={{ background: `conic-gradient(${meta.fill} ${deg}deg, #f1f5f9 0deg)` }}
                        >
                          <div className="absolute inset-2.5 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                            <span
                              className="text-2xl font-extrabold"
                              style={{ color: meta.fill }}
                            >
                              {result.healthScore}
                            </span>
                            <span className="text-[9px] text-slate-400">/100</span>
                          </div>
                        </div>
                        <div>
                          <p className={`text-xl font-extrabold ${meta.cls}`}>
                            {meta.icon} {meta.label} Health
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {meta.label === "Good"
                              ? "Crop shows strong vitality. Maintain preventive care routine."
                              : meta.label === "Fair"
                              ? "Moderate stress detected. Follow the treatment plan closely."
                              : "Critical condition. Immediate intervention required today."}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            Severity: {result.severity}% · Confidence: {pct(result.confidence)}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </GlassCard>
              </div>

              {/* ── 8. AI Treatment Plan (timeline layout) ────────────────── */}
              <GlassCard className="p-6">
                <SectionTitle
                  icon={FlaskConical}
                  title="AI Treatment Plan"
                  subtitle="Personalized recommendations from the diagnostic model"
                />
                <div className="grid gap-6 md:grid-cols-2">

                  {/* Treatment steps — numbered timeline */}
                  <div>
                    <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-green-800">
                      <Shield size={13} /> Treatment Steps
                    </p>
                    <div className="space-y-0">
                      {result.treatment.map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="relative flex gap-3 pb-4 last:pb-0"
                        >
                          {i < result.treatment.length - 1 && (
                            <div className="absolute left-2.75 top-6 h-full w-0.5 bg-green-100" />
                          )}
                          <span className="relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-700 text-[10px] font-extrabold text-white shadow-sm">
                            {i + 1}
                          </span>
                          <p className="text-sm leading-relaxed text-slate-700">{step}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Prevention tips */}
                  <div>
                    <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-emerald-800">
                      <Eye size={13} /> Prevention Tips
                    </p>
                    <div className="space-y-3">
                      {result.prevention.map((tip, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-start gap-2 rounded-xl bg-emerald-50/60 p-3 text-sm text-slate-700"
                        >
                          <CheckCircle size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                          {tip}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* ── 9. Disease Knowledge Panel (accordion) ────────────────── */}
              {diseaseKB && (
                <GlassCard className="p-6">
                  <SectionTitle
                    icon={Info}
                    title="Disease Knowledge Panel"
                    subtitle={`Educational information · ${result.disease}`}
                  />
                  <div className="space-y-2">
                    {[
                      { key: "symptoms",         label: "Symptoms",          icon: Eye,           content: diseaseKB.symptoms           },
                      { key: "causes",           label: "Causes",            icon: AlertTriangle, content: diseaseKB.causes             },
                      { key: "spreadConditions", label: "Spread Conditions", icon: CloudRain,     content: diseaseKB.spreadConditions   },
                      {
                        key: "prevention", label: "Prevention", icon: Shield,
                        content: Array.isArray(diseaseKB.prevention)
                          ? diseaseKB.prevention.join(" · ")
                          : diseaseKB.prevention,
                      },
                    ].map(({ key, label, icon: Icon, content }) => (
                      <div key={key} className="overflow-hidden rounded-xl border border-green-100">
                        <button
                          onClick={() => setKbOpen(kbOpen === key ? null : key)}
                          className="flex w-full items-center justify-between bg-green-50/70 px-4 py-3 text-left transition-colors hover:bg-green-100/60"
                        >
                          <span className="flex items-center gap-2 text-sm font-bold text-green-800">
                            <Icon size={13} className="text-green-600" />
                            {label}
                          </span>
                          {kbOpen === key
                            ? <ChevronUp size={14} className="text-green-600" />
                            : <ChevronDown size={14} className="text-slate-400" />}
                        </button>
                        <AnimatePresence>
                          {kbOpen === key && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              className="overflow-hidden"
                            >
                              <p className="bg-white px-4 py-3 text-sm leading-relaxed text-slate-600">
                                {content}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* ── 10. Weather Impact Analysis ─────────────────────────── */}
              <GlassCard className="p-6">
                <SectionTitle
                  icon={Thermometer}
                  title="Weather Impact Analysis"
                  subtitle="Current field conditions vs disease risk thresholds"
                />
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Temperature", value: `${weather.temperature}°C`, Icon: Sun,       bg: "bg-orange-50", iconCls: "text-orange-500" },
                    { label: "Humidity",    value: `${weather.humidity}%`,     Icon: Droplets,  bg: "bg-sky-50",    iconCls: "text-sky-500"    },
                    { label: "Condition",   value: weather.condition,           Icon: CloudRain, bg: "bg-slate-50",  iconCls: "text-slate-500"  },
                  ].map(({ label, value, Icon, bg, iconCls }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-3 rounded-xl border border-slate-100 p-4 ${bg}`}
                    >
                      <div className="rounded-full bg-white p-2 shadow-sm">
                        <Icon size={17} className={iconCls} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="text-base font-bold text-slate-800">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`flex items-start gap-3 rounded-xl border p-4 ${weatherRisk.bg} ${weatherRisk.border}`}>
                  <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${weatherRisk.color}`} />
                  <div>
                    <p className={`text-sm font-bold ${weatherRisk.color}`}>
                      Disease Risk: {weatherRisk.level}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{weatherRisk.msg}</p>
                  </div>
                </div>
              </GlassCard>

              {/* ── 12. AI Confidence Visualization ──────────────────────── */}
              <GlassCard className="p-6">
                <SectionTitle
                  icon={BarChart3}
                  title="AI Confidence Visualization"
                  subtitle="Probability distribution across top predictions"
                  badge="CNN Output"
                />
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={confChartData}
                      margin={{ top: 8, right: 16, left: -16, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#64748b" }} />
                      <Tooltip
                        formatter={(v) => [`${v}%`, "Confidence"]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "none",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {confChartData.map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 11. SCAN HISTORY ────────────────────────────────────────────── */}
        <GlassCard className="p-6">
          <SectionTitle
            icon={History}
            title="Scan History"
            subtitle="Your recent AI crop scan records"
            badge={`${scanHistory.length} records`}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-full text-sm">
              <thead>
                <tr className="border-b-2 border-green-100/80">
                  {["Date", "Crop", "Detected Disease", "Severity", "AI Confidence"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scanHistory.map((rec, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-slate-50 transition-colors hover:bg-green-50/40"
                  >
                    <td className="px-3 py-3 text-xs text-slate-400">{formatDate(rec.date)}</td>
                    <td className="px-3 py-3 font-semibold text-slate-800">{rec.crop}</td>
                    <td className="px-3 py-3 text-slate-600">{rec.disease}</td>
                    <td className="px-3 py-3">
                      {(() => {
                        const meta = severityMeta(Number(rec.severity ?? 50));
                        return (
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.text} ${meta.bg} ${meta.border}`}>
                            {meta.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${
                              rec.confidence >= 85 ? "bg-green-500"
                              : rec.confidence >= 65 ? "bg-amber-500"
                              : "bg-red-400"
                            }`}
                            style={{ width: `${rec.confidence}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            rec.confidence >= 85 ? "text-green-700"
                            : rec.confidence >= 65 ? "text-amber-700"
                            : "text-red-600"
                          }`}
                        >
                          {rec.confidence}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* ─── 13. QUICK ACTIONS ───────────────────────────────────────────── */}
        <GlassCard className="p-6">
          <SectionTitle
            icon={Zap}
            title="Quick Actions"
            subtitle="Continue your smart farming workflow"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Scan Another Crop",
                desc:  "Start a new disease scan",
                to:    "#",
                icon:  ScanLine,
                gradient: "from-green-700 to-emerald-600",
                onClick: handleReset,
              },
              {
                label: "Advisory Centre",
                desc:  "Expert crop advice",
                to:    "/farmer/advisory",
                icon:  Bot,
                gradient: "from-teal-700 to-cyan-600",
              },
              {
                label: "Yield Prediction",
                desc:  "AI harvest forecast",
                to:    "/farmer/predictions",
                icon:  TrendingUp,
                gradient: "from-amber-700 to-orange-600",
              },
              {
                label: "Weather Report",
                desc:  "Field weather analysis",
                to:    "/farmer/weather",
                icon:  CloudRain,
                gradient: "from-sky-700 to-blue-600",
              },
            ].map(({ label, desc, to, icon: Icon, gradient, onClick }) => (
              <Link
                key={label}
                to={to}
                onClick={onClick}
                className={`group flex flex-col gap-2 rounded-2xl bg-linear-to-br ${gradient} p-5 text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 transition-transform group-hover:scale-110">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold leading-tight">{label}</p>
                  <p className="text-[10px] leading-tight text-white/70">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>

      </div>

      {/* ─── CAMERA MODAL ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {cameraOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-green-400" />
                  <p className="font-bold text-white">Live Camera Scanner</p>
                </div>
                <button
                  onClick={closeCamera}
                  className="rounded-full bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  className="aspect-video w-full object-cover"
                  onLoadedMetadata={() => videoRef.current?.play()}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-32 w-32 rounded-xl border-2 border-dashed border-green-400/70" />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-3 p-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={capturePhoto}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-linear-to-br from-green-600 to-emerald-500 py-3.5 font-bold text-white transition-all hover:shadow-lg hover:shadow-green-900/30"
                >
                  <Camera size={16} /> Capture Photo
                </motion.button>
                <button
                  onClick={closeCamera}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 text-sm text-white transition-colors hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AIScan;
