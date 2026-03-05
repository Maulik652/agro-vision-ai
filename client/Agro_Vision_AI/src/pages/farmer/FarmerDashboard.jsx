import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Brain,
  CheckCircle2,
  Clock3,
  CalendarCheck,
  CloudRain,
  Droplets,
  Leaf,
  Radar,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Sun,
  ThermometerSun,
  TrendingUp,
  Wind
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useAuth } from "../../context/AuthContext";

const CROP_OPTIONS = ["All", "Cotton", "Wheat", "Groundnut", "Vegetables", "Rice"];
const TIME_RANGE_OPTIONS = [7, 14, 30];
const DAY_LABELS_7 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BASELINE_BY_CROP = {
  All: 84,
  Cotton: 87,
  Wheat: 81,
  Groundnut: 79,
  Vegetables: 90,
  Rice: 83
};

const WEATHER_STATES = [
  { condition: "Sunny", temp: 29, humidity: 64, wind: 12, rainChance: 20 },
  { condition: "Cloudy", temp: 27, humidity: 69, wind: 15, rainChance: 42 },
  { condition: "Light Rain", temp: 25, humidity: 76, wind: 11, rainChance: 68 },
  { condition: "Clear", temp: 28, humidity: 60, wind: 10, rainChance: 16 }
];

const BASE_MARKET = [
  { crop: "Cotton", basePrice: 6380 },
  { crop: "Wheat", basePrice: 2580 },
  { crop: "Groundnut", basePrice: 5940 },
  { crop: "Vegetables", basePrice: 3260 },
  { crop: "Rice", basePrice: 3020 }
];

const FIELD_ZONES = [
  { name: "North Field", crop: "Cotton", baseHealth: 90 },
  { name: "River Patch", crop: "Wheat", baseHealth: 83 },
  { name: "South Block", crop: "Groundnut", baseHealth: 77 },
  { name: "Greenhouse", crop: "Vegetables", baseHealth: 93 },
  { name: "East Terrace", crop: "Rice", baseHealth: 82 }
];

const DAILY_TASKS = [
  { id: 1, label: "Run morning field inspection", done: false },
  { id: 2, label: "Check drip irrigation valves", done: true },
  { id: 3, label: "Upload fresh crop scan to AI", done: false },
  { id: 4, label: "Review mandi pricing update", done: false }
];

const quickActions = [
  { label: "Scan Crop", icon: Sparkles, path: "/farmer/scan" },
  { label: "AI Advisory", icon: Brain, path: "/farmer/advisory" },
  { label: "Predictions", icon: TrendingUp, path: "/farmer/predictions" },
  { label: "Marketplace", icon: ShoppingCart, path: "/farmer/marketplace" },
  { label: "Weather", icon: CloudRain, path: "/farmer/weather" }
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (index = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.45, ease: "easeOut" }
  })
};

const MotionLink = motion(Link);

const FarmerDashboard = () => {
  const { user } = useAuth();

  const [selectedCrop, setSelectedCrop] = useState("All");
  const [timeRange, setTimeRange] = useState(7);
  const [liveTick, setLiveTick] = useState(0);
  const [clock, setClock] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [series, setSeries] = useState({ health: true, moisture: true });
  const [briefIndex, setBriefIndex] = useState(0);
  const [tasks, setTasks] = useState(DAILY_TASKS);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setClock(new Date());
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    const dataTimer = setInterval(() => {
      setLiveTick((prev) => prev + 1);
      setLastUpdated(new Date());
    }, 12000);

    return () => clearInterval(dataTimer);
  }, []);

  useEffect(() => {
    const briefTimer = setInterval(() => {
      setBriefIndex((prev) => prev + 1);
    }, 5500);

    return () => clearInterval(briefTimer);
  }, []);

  const farmerName = user?.name ? user.name.split(" ")[0] : "Farmer";
  const weather = WEATHER_STATES[liveTick % WEATHER_STATES.length];

  const trendData = useMemo(() => {
    const cropBaseline = BASELINE_BY_CROP[selectedCrop] ?? BASELINE_BY_CROP.All;

    return Array.from({ length: timeRange }, (_, index) => {
      const point = index + 1;
      const growthCurve = (point / timeRange) * 11;
      const healthWave = Math.sin((point + liveTick) * 0.72) * 3.5;
      const moistureWave = Math.cos((point + liveTick) * 0.64) * 4.2;

      const health = Math.round(
        Math.min(98, Math.max(58, cropBaseline - 8 + growthCurve + healthWave))
      );

      const moisture = Math.round(
        Math.min(
          95,
          Math.max(52, 67 + moistureWave + (selectedCrop === "Vegetables" ? 4 : 0))
        )
      );

      return {
        day: timeRange === 7 ? DAY_LABELS_7[index] : `D${point}`,
        health,
        moisture
      };
    });
  }, [selectedCrop, timeRange, liveTick]);

  const visibleZones = useMemo(() => {
    const filteredZones =
      selectedCrop === "All"
        ? FIELD_ZONES
        : FIELD_ZONES.filter((zone) => zone.crop === selectedCrop);

    return filteredZones.map((zone, index) => {
      const drift = Math.round(Math.sin((liveTick + index + 1) * 0.65) * 3);
      const health = Math.max(60, Math.min(98, zone.baseHealth + drift));

      let moisture = "Low";

      if (weather.rainChance > 60) {
        moisture = "High";
      } else if (health >= 88) {
        moisture = "Optimal";
      } else if (health >= 76) {
        moisture = "Moderate";
      }

      return { ...zone, health, moisture };
    });
  }, [selectedCrop, liveTick, weather.rainChance]);

  const marketPulse = useMemo(() => {
    const filteredMarket =
      selectedCrop === "All"
        ? BASE_MARKET
        : BASE_MARKET.filter((item) => item.crop === selectedCrop);

    return filteredMarket.map((item, index) => {
      const dynamicPrice = Math.round(
        item.basePrice * (1 + Math.sin((liveTick + index + 1) * 0.4) * 0.02)
      );

      return {
        crop: item.crop,
        price: dynamicPrice,
        momentum: dynamicPrice >= item.basePrice ? "up" : "down"
      };
    });
  }, [selectedCrop, liveTick]);

  const marketLeader = useMemo(() => {
    return [...marketPulse].sort((left, right) => right.price - left.price)[0] ?? BASE_MARKET[0];
  }, [marketPulse]);

  const avgHealth = useMemo(() => {
    const total = trendData.reduce((sum, row) => sum + row.health, 0);
    return Math.round(total / trendData.length);
  }, [trendData]);

  const avgMoisture = useMemo(() => {
    const total = trendData.reduce((sum, row) => sum + row.moisture, 0);
    return Math.round(total / trendData.length);
  }, [trendData]);

  const criticalAlerts = useMemo(() => {
    const lowHealthCount = visibleZones.filter((zone) => zone.health < 78).length;
    const weatherAlert = weather.rainChance > 65 ? 1 : 0;
    return lowHealthCount + weatherAlert;
  }, [visibleZones, weather.rainChance]);

  const completedTasks = tasks.filter((task) => task.done).length;
  const completionRate = Math.round((completedTasks / tasks.length) * 100);

  const stats = [
    {
      icon: Leaf,
      label: "Overall Crop Health",
      value: `${avgHealth}%`,
      trend: avgHealth >= 84 ? "High vitality" : "Watch closely",
      positive: avgHealth >= 84
    },
    {
      icon: Droplets,
      label: "Soil Moisture Avg",
      value: `${avgMoisture}%`,
      trend: avgMoisture >= 66 ? "Within target" : "Needs irrigation",
      positive: avgMoisture >= 66
    },
    {
      icon: ThermometerSun,
      label: "Temperature",
      value: `${weather.temp}°C`,
      trend: `Humidity ${weather.humidity}%`,
      positive: weather.temp <= 32
    },
    {
      icon: AlertTriangle,
      label: "Critical Alerts",
      value: String(criticalAlerts).padStart(2, "0"),
      trend: criticalAlerts > 0 ? "Action needed" : "No urgent issue",
      positive: criticalAlerts === 0
    }
  ];

  const advisoryFeed = useMemo(() => {
    const weakestZone =
      [...visibleZones].sort((left, right) => left.health - right.health)[0] ??
      FIELD_ZONES[0];

    const cropLabel = selectedCrop === "All" ? weakestZone.crop : selectedCrop;

    return [
      {
        title: `${cropLabel} stress monitor`,
        detail: `${weakestZone.name} is at ${weakestZone.health}% health. Schedule inspection in the next 6 hours.`,
        tone: weakestZone.health < 80 ? "warning" : "info"
      },
      {
        title: `Rain probability ${weather.rainChance}%`,
        detail:
          weather.rainChance > 55
            ? "Delay major irrigation by 8-10 hours and prioritize drainage checks."
            : "Current conditions support regular irrigation cycle and nutrient delivery.",
        tone: weather.rainChance > 55 ? "info" : "success"
      },
      {
        title: `${marketLeader.crop} market signal`,
        detail:
          marketLeader.momentum === "up"
            ? `Uptrend detected near ₹${marketLeader.price}/quintal. Consider staggered selling over 2 days.`
            : `Price softening near ₹${marketLeader.price}/quintal. Hold stock if storage conditions are stable.`,
        tone: marketLeader.momentum === "up" ? "success" : "warning"
      }
    ];
  }, [marketPulse, selectedCrop, visibleZones, weather.rainChance]);

  const insightScore = useMemo(() => {
    return Math.round((avgHealth * 0.55) + (avgMoisture * 0.25) + (completionRate * 0.2));
  }, [avgHealth, avgMoisture, completionRate]);

  const insightTone = insightScore >= 86
    ? "Excellent"
    : insightScore >= 75
      ? "Stable"
      : "Needs Focus";

  const liveBrief = advisoryFeed[briefIndex % advisoryFeed.length];

  const toggleSeries = (seriesKey) => {
    setSeries((prev) => {
      const next = { ...prev, [seriesKey]: !prev[seriesKey] };

      if (!next.health && !next.moisture) {
        return prev;
      }

      return next;
    });
  };

  const toggleTask = (taskId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      )
    );
  };

  return (
    <div className="relative min-h-screen bg-linear-to-b from-green-50 via-white to-emerald-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-16 -top-12 h-56 w-56 rounded-full bg-green-200/50 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-0 top-44 h-60 w-60 rounded-full bg-emerald-200/40 blur-3xl"
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl overflow-hidden border border-green-300/40 shadow-lg"
        >
          <div className="bg-linear-to-r from-[#14532D] via-green-700 to-green-600 text-white p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="inline-flex items-center gap-2 text-xs sm:text-sm bg-white/15 px-3 py-1 rounded-full">
                  <Bot size={14} />
                  AI Farming Command Center
              </p>
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm bg-white/15 px-3 py-1 rounded-full">
                <RefreshCw size={14} className="animate-spin" style={{ animationDuration: "3s" }} />
                Live updates active
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
                  Welcome back, {farmerName}. Your farm is running with smart precision.
                </h1>
                <p className="text-sm sm:text-base text-green-100 max-w-2xl">
                  Dynamic crop intelligence, weather adaptation, and market timing recommendations in one responsive command center.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-green-100">
                  <span className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                    <Clock3 size={14} />
                    {clock.toLocaleTimeString()}
                  </span>
                  <span className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                    Last sync: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <InsightRing score={insightScore} tone={insightTone} />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <WeatherChip icon={Sun} title={weather.condition} value={`${weather.temp}°C`} />
                  <WeatherChip icon={Droplets} title="Humidity" value={`${weather.humidity}%`} />
                  <WeatherChip icon={Wind} title="Wind" value={`${weather.wind} km/h`} />
                  <WeatherChip icon={CalendarCheck} title="Task Done" value={`${completedTasks}/${tasks.length}`} />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px]">
              <div>
                <p className="text-xs sm:text-sm text-green-100 mb-2">Time Range</p>
                <div className="flex flex-wrap gap-2">
                  {TIME_RANGE_OPTIONS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setTimeRange(days)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        timeRange === days
                          ? "bg-white text-green-700 border-white"
                          : "border-white/30 text-white hover:bg-white/10"
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm text-green-100 mb-2 block">Crop Focus</label>
                <select
                  value={selectedCrop}
                  onChange={(event) => setSelectedCrop(event.target.value)}
                  className="w-full rounded-xl bg-white text-slate-800 px-3 py-2 text-sm outline-none"
                >
                  {CROP_OPTIONS.map((crop) => (
                    <option key={crop} value={crop}>
                      {crop}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/20 bg-white/10 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="inline-flex items-center gap-2 text-xs sm:text-sm text-green-100">
                  <Radar size={14} />
                  Live AI Brief
                </p>
                <span className="text-xs text-green-100/90">
                  {(briefIndex % advisoryFeed.length) + 1}/{advisoryFeed.length}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${liveBrief.title}-${briefIndex}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-sm font-semibold text-white">{liveBrief.title}</p>
                  <p className="text-xs sm:text-sm text-green-100 mt-1">{liveBrief.detail}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          {stats.map((card, index) => (
            <StatCard key={card.label} card={card} index={index + 1} />
          ))}
        </motion.section>

        <div className="grid xl:grid-cols-3 gap-6">
          <motion.section
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="xl:col-span-2 bg-white rounded-3xl border border-green-100 shadow-sm p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800">Farm Health Intelligence</h2>
                <p className="text-sm text-slate-500">
                  {selectedCrop} view for the last {timeRange} days
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">
                  <TrendingUp size={14} />
                  Best mandi: {marketLeader.crop}
                </span>

                <SeriesToggle
                  label="Health"
                  active={series.health}
                  theme="health"
                  onClick={() => toggleSeries("health")}
                />

                <SeriesToggle
                  label="Moisture"
                  active={series.moisture}
                  theme="moisture"
                  onClick={() => toggleSeries("moisture")}
                />
              </div>
            </div>

            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} interval={timeRange > 14 ? 3 : 0} />
                  <YAxis hide domain={[50, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, borderColor: "#bbf7d0" }}
                    formatter={(value, name) => [
                      `${value}%`,
                      name === "health" ? "Health" : "Moisture"
                    ]}
                  />
                  {series.moisture && (
                    <Area type="monotone" dataKey="moisture" stroke="#14b8a6" fill="url(#moistureGradient)" strokeWidth={2} />
                  )}
                  {series.health && (
                    <Area type="monotone" dataKey="health" stroke="#22c55e" fill="url(#healthGradient)" strokeWidth={3} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          <motion.section
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="bg-white rounded-3xl border border-green-100 shadow-sm p-5 sm:p-6"
          >
            <h2 className="text-lg font-semibold text-slate-800 mb-4">AI Advisory Feed</h2>
            <div className="space-y-3">
              {advisoryFeed.map((item) => (
                <AdvisoryCard key={`${item.title}-${item.tone}`} item={item} />
              ))}
            </div>
          </motion.section>
        </div>

        <div className="grid xl:grid-cols-3 gap-6">
          <motion.section
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="xl:col-span-2 bg-white rounded-3xl border border-green-100 shadow-sm p-5 sm:p-6"
          >
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-4">Field Zone Performance</h2>
            <div className="space-y-4">
              {visibleZones.map((zone) => (
                <motion.div
                  key={zone.name}
                  whileHover={{ y: -2 }}
                  className="border border-slate-200 rounded-2xl p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{zone.name}</p>
                      <p className="text-sm text-slate-500">{zone.crop}</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                      Moisture: {zone.moisture}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="text-slate-500">Health score</span>
                    <span className="font-semibold text-slate-700">{zone.health}%</span>
                  </div>
                  <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${zone.health}%` }}
                      transition={{ duration: 0.7 }}
                      className="h-full bg-green-600"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="bg-white rounded-3xl border border-green-100 shadow-sm p-5 sm:p-6"
          >
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Market Pulse</h2>
            <p className="text-sm text-slate-500 mb-4">Live mandi trend snapshot (₹/quintal)</p>

            <div className="rounded-2xl border border-green-100 bg-green-50 p-3 mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Top crop signal</p>
                <p className="font-semibold text-slate-800">{marketLeader.crop}</p>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  marketLeader.momentum === "up"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {marketLeader.momentum === "up" ? <TrendingUp size={14} /> : <ArrowDownRight size={14} />}
                ₹{marketLeader.price}
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketPulse}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="crop" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, borderColor: "#bbf7d0" }}
                    formatter={(value) => [`₹${value}`, "Price"]}
                  />
                  <Bar dataKey="price" radius={[8, 8, 0, 0]}>
                    {marketPulse.map((item) => (
                      <Cell
                        key={item.crop}
                        fill={item.momentum === "up" ? "#16a34a" : "#f59e0b"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
                Up trend
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                Softening
              </span>
            </div>
          </motion.section>
        </div>

        <div className="grid xl:grid-cols-3 gap-6">
          <motion.section
            custom={5}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="bg-white rounded-3xl border border-green-100 shadow-sm p-5 sm:p-6"
          >
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">Today’s Smart Tasks</h2>
            <p className="text-sm text-slate-500 mb-4">Interactive checklist synced with your dashboard focus</p>

            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-500">Completion</span>
                <span className="font-medium text-green-700">{completionRate}%</span>
              </div>
              <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-green-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              {tasks.map((task) => (
                <motion.button
                  key={task.id}
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ x: 2 }}
                  className="w-full text-left flex items-center gap-3 border border-slate-200 rounded-xl px-3 py-2 hover:border-green-300 transition"
                >
                  <CheckCircle2
                    size={18}
                    className={task.done ? "text-green-600" : "text-slate-300"}
                  />
                  <span className={`text-sm ${task.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                    {task.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.section>

          <motion.section
            custom={6}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="xl:col-span-2 bg-white rounded-3xl border border-green-100 shadow-sm p-5 sm:p-6"
          >
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
              {quickActions.map((item) => (
                <MotionLink
                  key={item.label}
                  to={item.path}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="group rounded-2xl border border-green-200 bg-linear-to-b from-green-50 to-white p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
                      <item.icon size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-slate-400 group-hover:text-green-700 transition" />
                  </div>
                  <p className="font-medium text-slate-800 group-hover:text-green-700 transition">{item.label}</p>
                </MotionLink>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};

const InsightRing = ({ score, tone }) => (
  <motion.div
    whileHover={{ y: -2 }}
    className="rounded-2xl bg-white/10 border border-white/20 p-3 sm:p-4"
  >
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="inline-flex items-center gap-1.5 text-xs text-green-100">
          <Activity size={14} />
          AI Insight Score
        </p>
        <p className="text-sm font-semibold text-white mt-1">{tone}</p>
      </div>

      <div
        className="relative h-16 w-16 rounded-full p-1"
        style={{
          background: `conic-gradient(#86efac ${score * 3.6}deg, rgba(255,255,255,0.22) 0deg)`
        }}
      >
        <div className="h-full w-full rounded-full bg-[#14532D] flex items-center justify-center text-sm font-bold text-white">
          {score}
        </div>
      </div>
    </div>
  </motion.div>
);

const SeriesToggle = ({ label, active, theme, onClick }) => {
  const activeClasses = theme === "health"
    ? "bg-green-100 text-green-700 border-green-200"
    : "bg-teal-100 text-teal-700 border-teal-200";

  const dotClasses = theme === "health" ? "bg-green-600" : "bg-teal-600";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border transition ${
        active ? activeClasses : "bg-white text-slate-500 border-slate-200"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? dotClasses : "bg-slate-300"}`} />
      {label}
    </button>
  );
};

const WeatherChip = ({ icon: Icon, title, value }) => (
  <motion.div
    whileHover={{ y: -1 }}
    className="rounded-2xl bg-white/15 border border-white/20 p-3"
  >
    <div className="flex items-center gap-2 text-green-100 mb-1">
      <Icon size={15} />
      <span className="text-xs">{title}</span>
    </div>
    <p className="font-semibold">{value}</p>
  </motion.div>
);

const StatCard = ({ card, index }) => (
  <motion.div
    custom={index}
    variants={fadeUp}
    whileHover={{ y: -3 }}
    whileTap={{ scale: 0.99 }}
    className="bg-white rounded-3xl border border-green-100 shadow-sm p-5"
  >
    <div className="flex items-start justify-between gap-2 mb-4">
      <div className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
        <card.icon size={20} />
      </div>
      <span
        className={`text-xs px-2.5 py-1 rounded-full ${
          card.positive
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
        }`}
      >
        {card.trend}
      </span>
    </div>
    <p className="text-sm text-slate-500">{card.label}</p>
    <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
  </motion.div>
);

const toneStyles = {
  warning: "bg-yellow-50 border-yellow-200",
  info: "bg-blue-50 border-blue-200",
  success: "bg-green-50 border-green-200"
};

const AdvisoryCard = ({ item }) => (
  <motion.article
    whileHover={{ y: -2 }}
    className={`rounded-2xl border p-4 ${toneStyles[item.tone]}`}
  >
    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{item.detail}</p>
  </motion.article>
);

export default FarmerDashboard;