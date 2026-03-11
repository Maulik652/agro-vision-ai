import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  ComposedChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  BrainCircuit,
  CalendarDays,
  Cloud,
  CloudRain,
  CloudSun,
  Droplets,
  Gauge,
  History,
  LocateFixed,
  MapPin,
  RefreshCcw,
  ShieldAlert,
  Sprout,
  Sun,
  Thermometer,
  TriangleAlert,
  Umbrella,
  Wind,
  Waves
} from "lucide-react";
import api from "../../api/axios";

const CACHE_TTL_MS = 10 * 60 * 1000;
const AUTO_REFRESH_MS = 3 * 60 * 1000;

const palette = {
  sky: "#38B6FF",
  green: "#2A9D5B",
  yellow: "#F4C542",
  cloud: "#EEF5FA",
  ink: "#12415A",
  rain: "#2F7FD2"
};

const sectionVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: (index = 1) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, delay: index * 0.06, ease: "easeOut" }
  })
};

const CROP_OPTIONS = ["Rice", "Wheat", "Cotton", "Tomato", "Potato", "Maize"];

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseDateLike = (value, fallbackDays = 0) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const fromUnix = value > 10000000000 ? value : value * 1000;
    const unixDate = new Date(fromUnix);
    if (!Number.isNaN(unixDate.getTime())) {
      return unixDate;
    }
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + fallbackDays);
  return fallback;
};

const dayLabel = (value, index = 0, short = false) => {
  const date = parseDateLike(value, index);
  return date.toLocaleDateString("en-US", { weekday: short ? "short" : "long" });
};

const conditionBucket = (condition, rainProbability, cloudCoverage, windSpeed) => {
  const text = String(condition || "").toLowerCase();

  if (text.includes("storm") || text.includes("thunder")) {
    return "storm";
  }

  if (rainProbability >= 55 || text.includes("rain") || text.includes("drizzle")) {
    return "rain";
  }

  if (windSpeed >= 24 || text.includes("wind")) {
    return "wind";
  }

  if (cloudCoverage >= 60 || text.includes("cloud") || text.includes("mist") || text.includes("haze")) {
    return "cloud";
  }

  return "sun";
};

const buildFallbackForecast = () => {
  const base = 30;

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);

    const tempSwing = Math.round(Math.sin((index + 1) * 0.92) * 4);
    const rain = clamp(43 + Math.round(Math.cos((index + 1) * 0.74) * 26), 12, 92);
    const humidity = clamp(63 + Math.round(Math.sin(index * 0.71) * 18), 36, 91);
    const windSpeed = clamp(9 + Math.round(Math.cos(index * 0.82) * 5), 4, 28);
    const temp = base + tempSwing;

    let condition = "Clear";
    if (rain >= 70) {
      condition = "Rainy";
    } else if (windSpeed >= 22) {
      condition = "Windy";
    } else if (humidity >= 74) {
      condition = "Cloudy";
    } else if (temp >= 35) {
      condition = "Sunny";
    }

    return {
      day: dayLabel(date, index, false),
      dayShort: dayLabel(date, index, true),
      dateISO: date.toISOString(),
      temperature: temp,
      minTemp: temp - 3,
      maxTemp: temp + 2,
      humidity,
      windSpeed,
      rainProbability: rain,
      condition,
      cloudCoverage: clamp(Math.round((humidity + rain) / 2), 30, 94)
    };
  });
};

const buildFallbackCurrent = (forecast) => {
  const source = forecast[0] || buildFallbackForecast()[0];

  return {
    temperature: source.temperature,
    humidity: source.humidity,
    windSpeed: source.windSpeed,
    rainfall: source.rainProbability,
    cloudCoverage: source.cloudCoverage,
    uvIndex: clamp(Math.round((source.temperature - 22) / 2), 3, 11),
    condition: source.condition,
    feelsLike: source.temperature + 1,
    location: "Farm Zone",
    updatedAt: new Date().toISOString()
  };
};

const buildFallbackHistory = (current, forecast) => {
  return Array.from({ length: 7 }, (_, index) => {
    const reverseIndex = 6 - index;
    const date = new Date();
    date.setDate(date.getDate() - reverseIndex);

    const linkedForecast = forecast[index] || forecast[0] || current;
    const rainfall = clamp(linkedForecast.rainProbability - Math.round(reverseIndex * 3.4), 8, 94);
    const temperature = clamp(
      linkedForecast.temperature - Math.round(reverseIndex * 0.6) + Math.round(Math.cos(index * 0.6) * 2),
      16,
      45
    );

    return {
      day: dayLabel(date, reverseIndex, true),
      temperature,
      rainfall
    };
  });
};

const normalizeCurrent = (raw) => {
  const temperature = toNumber(raw?.temperature ?? raw?.temp ?? raw?.main?.temp, 30);
  const humidity = toNumber(raw?.humidity ?? raw?.main?.humidity, 66);
  const windSpeed = toNumber(raw?.windSpeed ?? raw?.wind_speed ?? raw?.wind?.speed, 10);
  const rainfall = toNumber(
    raw?.rainfall ?? raw?.rainProbability ?? raw?.rainChance ?? raw?.pop,
    34
  );
  const cloudCoverage = toNumber(raw?.cloudCoverage ?? raw?.clouds?.all ?? raw?.cloud, 52);
  const uvIndex = toNumber(raw?.uvIndex ?? raw?.uv ?? raw?.uvi, 6);

  return {
    temperature: Math.round(temperature),
    humidity: clamp(Math.round(humidity), 0, 100),
    windSpeed: clamp(Math.round(windSpeed), 0, 130),
    rainfall: clamp(Math.round(rainfall > 1 && rainfall <= 100 ? rainfall : rainfall * 100), 0, 100),
    cloudCoverage: clamp(Math.round(cloudCoverage), 0, 100),
    uvIndex: clamp(Math.round(uvIndex), 0, 14),
    condition:
      raw?.condition ||
      raw?.weather?.[0]?.main ||
      raw?.summary ||
      conditionBucket(raw?.condition, rainfall, cloudCoverage, windSpeed),
    feelsLike: Math.round(toNumber(raw?.feelsLike ?? raw?.feels_like ?? raw?.main?.feels_like, temperature + 1)),
    location: raw?.location || raw?.city || raw?.name || "Farm Zone",
    updatedAt: raw?.updatedAt || raw?.timestamp || raw?.dt || new Date().toISOString()
  };
};

const extractForecastArray = (raw) => {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (Array.isArray(raw?.forecast)) {
    return raw.forecast;
  }

  if (Array.isArray(raw?.daily)) {
    return raw.daily;
  }

  if (Array.isArray(raw?.list)) {
    return raw.list;
  }

  if (Array.isArray(raw?.data)) {
    return raw.data;
  }

  return [];
};

const normalizeForecast = (raw) => {
  const rows = extractForecastArray(raw);

  const deduped = [];
  const seenDays = new Set();

  rows.forEach((entry, index) => {
    const stamp = entry?.date || entry?.datetime || entry?.dt_txt || entry?.dt || entry?.timestamp;
    const date = parseDateLike(stamp, index);
    const key = date.toISOString().slice(0, 10);

    if (!seenDays.has(key) && deduped.length < 7) {
      seenDays.add(key);
      deduped.push({ ...entry, _sourceDate: date });
    }
  });

  const mapped = deduped.map((entry, index) => {
    const date = entry._sourceDate || parseDateLike(entry?.date, index);
    const temperature = toNumber(
      entry?.temperature ?? entry?.temp?.day ?? entry?.temp ?? entry?.main?.temp,
      29
    );
    const minTemp = toNumber(entry?.minTemp ?? entry?.temp?.min ?? entry?.main?.temp_min, temperature - 3);
    const maxTemp = toNumber(entry?.maxTemp ?? entry?.temp?.max ?? entry?.main?.temp_max, temperature + 2);
    const humidity = toNumber(entry?.humidity ?? entry?.main?.humidity, 60);
    const windSpeed = toNumber(entry?.windSpeed ?? entry?.wind_speed ?? entry?.wind?.speed, 8);
    const rainProbability = toNumber(
      entry?.rainProbability ?? entry?.rainChance ?? entry?.pop ?? entry?.precipitation_probability,
      38
    );
    const cloudCoverage = toNumber(entry?.cloudCoverage ?? entry?.clouds?.all ?? entry?.cloud, 54);

    return {
      day: dayLabel(date, index, false),
      dayShort: dayLabel(date, index, true),
      dateISO: date.toISOString(),
      temperature: Math.round(temperature),
      minTemp: Math.round(minTemp),
      maxTemp: Math.round(maxTemp),
      humidity: clamp(Math.round(humidity), 0, 100),
      windSpeed: clamp(Math.round(windSpeed), 0, 130),
      rainProbability: clamp(
        Math.round(rainProbability > 1 && rainProbability <= 100 ? rainProbability : rainProbability * 100),
        0,
        100
      ),
      condition:
        entry?.condition ||
        entry?.weather?.[0]?.main ||
        conditionBucket(entry?.condition, rainProbability, cloudCoverage, windSpeed),
      cloudCoverage: clamp(Math.round(cloudCoverage), 0, 100)
    };
  });

  if (!mapped.length) {
    return buildFallbackForecast();
  }

  if (mapped.length < 7) {
    const filler = buildFallbackForecast().slice(mapped.length);
    return [...mapped, ...filler].slice(0, 7);
  }

  return mapped.slice(0, 7);
};

const normalizeAnalysis = (raw) => {
  return {
    summary:
      raw?.summary ||
      "Weather trend stable with moderate variability. Use adaptive irrigation and crop protection scheduling.",
    recommendations: Array.isArray(raw?.recommendations)
      ? raw.recommendations
      : Array.isArray(raw?.advice)
        ? raw.advice
        : [],
    alerts: Array.isArray(raw?.alerts) ? raw.alerts : [],
    riskScore: clamp(Math.round(toNumber(raw?.riskScore ?? raw?.risk_score, 48)), 0, 100),
    irrigationHint:
      raw?.irrigationHint ||
      raw?.irrigation ||
      "Use early morning irrigation to reduce evaporation loss and avoid wet foliage at night.",
    history: Array.isArray(raw?.history) ? raw.history : []
  };
};

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.payload) {
      return null;
    }

    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (key, payload) => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        payload
      })
    );
  } catch {
    // Intentionally silent: cache write should never block UX.
  }
};

const WeatherGlyph = ({ condition, size = 44 }) => {
  const kind = conditionBucket(condition, 0, 0, 0);

  if (kind === "rain" || kind === "storm") {
    return (
      <Motion.div
        className="relative"
        animate={{ y: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      >
        <CloudRain size={size} style={{ color: palette.rain }} />
        <Motion.span
          className="absolute -bottom-2 left-1/2 h-2 w-2 rounded-full"
          style={{ background: "#69B6FF" }}
          animate={{ y: [0, 7], opacity: [0.8, 0] }}
          transition={{ repeat: Infinity, duration: 1.1 }}
        />
      </Motion.div>
    );
  }

  if (kind === "cloud") {
    return (
      <Motion.div
        animate={{ x: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
      >
        <CloudSun size={size} style={{ color: palette.sky }} />
      </Motion.div>
    );
  }

  if (kind === "wind") {
    return (
      <Motion.div
        animate={{ x: [0, 8, 0], opacity: [0.65, 1, 0.65] }}
        transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
      >
        <Wind size={size} style={{ color: "#4A8CD6" }} />
      </Motion.div>
    );
  }

  return (
    <Motion.div
      animate={{ rotate: [0, 8, 0] }}
      transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut" }}
    >
      <Sun size={size} style={{ color: palette.yellow }} />
    </Motion.div>
  );
};

const GlassCard = ({ title, subtitle, icon: Icon, children, className = "", action }) => {
  return (
    <section className={`weather-glass rounded-3xl p-5 shadow-[0_30px_55px_-38px_rgba(6,56,92,0.6)] ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#0C4568]">
            {Icon ? <Icon size={18} /> : null}
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-[#2A6078]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
};

const WeatherIntelligence = () => {
  const [manualLocation, setManualLocation] = useState("Surat");
  const [locationMode, setLocationMode] = useState("manual");
  const [coordinates, setCoordinates] = useState(null);
  const [locationError, setLocationError] = useState("");

  const [selectedCrop, setSelectedCrop] = useState("Rice");

  const [currentWeather, setCurrentWeather] = useState(buildFallbackCurrent(buildFallbackForecast()));
  const [forecast, setForecast] = useState(buildFallbackForecast());
  const [analysis, setAnalysis] = useState(normalizeAnalysis({}));
  const [historyRows, setHistoryRows] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataSource, setDataSource] = useState("fallback");

  const memoryCache = useRef(new Map());

  const requestParams = useMemo(() => {
    if (locationMode === "gps" && coordinates) {
      return {
        lat: coordinates.lat,
        lon: coordinates.lon
      };
    }

    return {
      location: manualLocation.trim() || "Surat"
    };
  }, [coordinates, locationMode, manualLocation]);

  const locationLabel = useMemo(() => {
    if (locationMode === "gps" && coordinates) {
      return `GPS (${coordinates.lat}, ${coordinates.lon})`;
    }

    return manualLocation.trim() || "Surat";
  }, [coordinates, locationMode, manualLocation]);

  const cacheKey = useMemo(
    () => `weather-intelligence:${JSON.stringify(requestParams)}`,
    [requestParams]
  );

  const applyPayload = useCallback((payload, source = "api") => {
    setCurrentWeather(payload.current);
    setForecast(payload.forecast);
    setAnalysis(payload.analysis);
    setHistoryRows(payload.history);
    setLastUpdated(new Date());
    setDataSource(source);
  }, []);

  const loadWeather = useCallback(
    async ({ silent = false, force = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      const inMemory = memoryCache.current.get(cacheKey);
      if (!force && inMemory && Date.now() - inMemory.timestamp <= CACHE_TTL_MS) {
        applyPayload(inMemory.payload, "cache");
        if (!silent) {
          setIsLoading(false);
        }
      }

      const onDisk = force ? null : readCache(cacheKey);
      if (onDisk?.payload) {
        applyPayload(onDisk.payload, "cache");
        if (!silent) {
          setIsLoading(false);
        }
      }

      try {
        const [currentResult, forecastResult, analysisResult] = await Promise.allSettled([
          api.get("/weather/current", { params: requestParams }),
          api.get("/weather/forecast", { params: requestParams }),
          api.get("/weather/analysis", { params: requestParams })
        ]);

        const hasLiveData =
          currentResult.status === "fulfilled" ||
          forecastResult.status === "fulfilled" ||
          analysisResult.status === "fulfilled";

        if (!hasLiveData) {
          throw new Error("All weather endpoints are unavailable");
        }

        const normalizedForecast = normalizeForecast(
          forecastResult.status === "fulfilled" ? forecastResult.value?.data : null
        );

        const normalizedCurrent = normalizeCurrent(
          currentResult.status === "fulfilled"
            ? currentResult.value?.data
            : buildFallbackCurrent(normalizedForecast)
        );

        const normalizedAnalysis = normalizeAnalysis(
          analysisResult.status === "fulfilled" ? analysisResult.value?.data : null
        );

        const normalizedHistory =
          normalizedAnalysis.history.length > 0
            ? normalizedAnalysis.history.map((row, index) => ({
                day: row?.day || dayLabel(new Date(), index, true),
                rainfall: clamp(Math.round(toNumber(row?.rainfall, 35)), 0, 100),
                temperature: clamp(Math.round(toNumber(row?.temperature, normalizedCurrent.temperature)), 0, 55)
              }))
            : buildFallbackHistory(normalizedCurrent, normalizedForecast);

        const payload = {
          current: normalizedCurrent,
          forecast: normalizedForecast,
          analysis: normalizedAnalysis,
          history: normalizedHistory
        };

        memoryCache.current.set(cacheKey, { timestamp: Date.now(), payload });
        writeCache(cacheKey, payload);
        applyPayload(payload, "api");
      } catch {
        if (!onDisk?.payload) {
          const fallbackForecast = buildFallbackForecast();
          const fallbackCurrent = buildFallbackCurrent(fallbackForecast);
          const fallbackAnalysis = normalizeAnalysis({});

          applyPayload(
            {
              current: fallbackCurrent,
              forecast: fallbackForecast,
              analysis: fallbackAnalysis,
              history: buildFallbackHistory(fallbackCurrent, fallbackForecast)
            },
            "fallback"
          );
        }

        setError("Live weather service unavailable. Showing cached or predictive data.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [applyPayload, cacheKey, requestParams]
  );

  useEffect(() => {
    loadWeather();

    const refreshTimer = setInterval(() => {
      loadWeather({ silent: true, force: true });
    }, AUTO_REFRESH_MS);

    return () => {
      clearInterval(refreshTimer);
    };
  }, [loadWeather]);

  const detectGps = () => {
    if (!navigator.geolocation) {
      setLocationError("GPS not supported in this browser. Use manual farm location.");
      return;
    }

    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lon = Number(position.coords.longitude.toFixed(4));

        setCoordinates({ lat, lon });
        setLocationMode("gps");
      },
      () => {
        setLocationError("Unable to read GPS coordinates. Please enter farm location manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 11000,
        maximumAge: 60000
      }
    );
  };

  const onManualSubmit = (event) => {
    event.preventDefault();
    setLocationMode("manual");

    if (!manualLocation.trim()) {
      setManualLocation("Surat");
    }
  };

  const rainTrend = useMemo(
    () =>
      forecast.map((row) => ({
        day: row.dayShort,
        rain: row.rainProbability
      })),
    [forecast]
  );

  const climateTrend = useMemo(
    () =>
      forecast.map((row) => ({
        day: row.dayShort,
        temperature: row.temperature,
        humidity: row.humidity
      })),
    [forecast]
  );

  const riskAlerts = useMemo(() => {
    const items = [];
    const highestRain = Math.max(currentWeather.rainfall, ...forecast.map((row) => row.rainProbability));
    const highestTemp = Math.max(currentWeather.temperature, ...forecast.map((row) => row.temperature));
    const highestWind = Math.max(currentWeather.windSpeed, ...forecast.map((row) => row.windSpeed));

    if (highestRain >= 72) {
      items.push({
        level: "high",
        title: "Heavy rainfall expected",
        detail: `Rain probability may reach ${highestRain} percent in the next 7 days.`,
        action: "Delay irrigation and ensure field drainage channels are clear."
      });
    }

    if (highestTemp >= 37) {
      items.push({
        level: "high",
        title: "Heatwave warning",
        detail: `Temperature can rise up to ${highestTemp} C.`,
        action: "Shift irrigation to dawn and use mulch to reduce soil moisture loss."
      });
    }

    if (highestWind >= 26) {
      items.push({
        level: "medium",
        title: "Strong wind conditions",
        detail: `Wind speed could touch ${highestWind} km/h.`,
        action: "Avoid pesticide spray during peak wind hours."
      });
    }

    if (currentWeather.humidity >= 80) {
      items.push({
        level: "medium",
        title: "Fungal disease pressure",
        detail: `Humidity is currently ${currentWeather.humidity} percent.`,
        action: "Increase crop scouting for mildew and leaf spot symptoms."
      });
    }

    if (currentWeather.uvIndex >= 10) {
      items.push({
        level: "medium",
        title: "UV stress risk",
        detail: `UV index is elevated at ${currentWeather.uvIndex}.`,
        action: "Protect sensitive seedlings with temporary shading during noon."
      });
    }

    return items;
  }, [currentWeather, forecast]);

  const irrigationPlan = useMemo(() => {
    const tomorrow = forecast[1] || forecast[0] || currentWeather;

    if (tomorrow.rainProbability >= 65) {
      return {
        level: "Low",
        timing: "Delay for 24 hours",
        frequency: "Skip next cycle",
        reason: "Rainfall expected soon, natural moisture likely sufficient."
      };
    }

    if (currentWeather.temperature >= 35 && currentWeather.humidity <= 45) {
      return {
        level: "High",
        timing: "05:30 to 07:00 and 18:00 to 19:00",
        frequency: "Twice daily for short cycles",
        reason: "Heat stress and low humidity increase evapotranspiration."
      };
    }

    if (currentWeather.humidity >= 78) {
      return {
        level: "Light",
        timing: "06:00 to 07:30",
        frequency: "One light cycle",
        reason: "High humidity slows moisture loss; avoid over-watering roots."
      };
    }

    return {
      level: "Moderate",
      timing: "05:45 to 07:15",
      frequency: "Once daily",
      reason: "Balanced climate conditions support standard irrigation scheduling."
    };
  }, [currentWeather, forecast]);

  const aiAdvice = useMemo(() => {
    const byApi = analysis.recommendations
      .slice(0, 3)
      .map((entry, index) => ({
        title: `AI Recommendation ${index + 1}`,
        insight: typeof entry === "string" ? entry : entry?.insight || "AI weather insight generated.",
        action:
          typeof entry === "object" && entry?.action
            ? entry.action
            : "Adjust irrigation and field operations according to rain and temperature trend.",
        confidence: clamp(Math.round(toNumber(entry?.confidence, 79)), 45, 99)
      }));

    if (byApi.length) {
      return byApi;
    }

    const tomorrow = forecast[1] || forecast[0];
    const generated = [];

    if (tomorrow?.rainProbability >= 60) {
      generated.push({
        title: "Rainfall expected tomorrow",
        insight: `Rain probability is ${tomorrow.rainProbability} percent for ${tomorrow.day}.`,
        action: "Delay irrigation for 24 hours and postpone foliar spray operations.",
        confidence: 88
      });
    }

    if (currentWeather.temperature >= 35) {
      generated.push({
        title: "High temperature risk",
        insight: `Current temperature is ${currentWeather.temperature} C with elevated heat stress potential.`,
        action: "Increase irrigation frequency in short intervals and monitor leaf wilting.",
        confidence: 84
      });
    }

    if (currentWeather.humidity >= 78) {
      generated.push({
        title: "Humidity-linked disease risk",
        insight: `Humidity is at ${currentWeather.humidity} percent, suitable for fungal development.`,
        action: "Increase field scouting and maintain canopy airflow.",
        confidence: 81
      });
    }

    if (!generated.length) {
      generated.push({
        title: "Stable weather window",
        insight: "No severe weather disruption detected for near-term field activities.",
        action: "Proceed with planned irrigation and pest management routines.",
        confidence: 76
      });
    }

    return generated.slice(0, 3);
  }, [analysis.recommendations, currentWeather, forecast]);

  const cropImpactRows = useMemo(() => {
    const maxRain = Math.max(...forecast.map((row) => row.rainProbability), currentWeather.rainfall);
    const heatLevel = currentWeather.temperature;

    return [
      {
        title: `${selectedCrop} humidity impact`,
        effect:
          currentWeather.humidity >= 78
            ? "High humidity may accelerate fungal spread in dense canopy zones."
            : "Humidity profile is currently favorable for healthy crop respiration.",
        action:
          currentWeather.humidity >= 78
            ? "Inspect lower leaf surfaces and improve air movement between rows."
            : "Maintain current canopy and ventilation practices."
      },
      {
        title: `${selectedCrop} rainfall impact`,
        effect:
          maxRain >= 72
            ? "Strong rain spells can cause waterlogging and nutrient leaching."
            : "Rainfall outlook supports regular growth without major waterlogging pressure.",
        action:
          maxRain >= 72
            ? "Open field drains and avoid heavy fertilizer before peak rain days."
            : "Keep routine nutrient application plan with moisture checks."
      },
      {
        title: `${selectedCrop} heat stress impact`,
        effect:
          heatLevel >= 36
            ? "High daytime heat can lower photosynthesis efficiency and reduce yield quality."
            : "Temperature range remains mostly within acceptable stress thresholds.",
        action:
          heatLevel >= 36
            ? "Irrigate during cooler windows and use mulch for soil cooling."
            : "Track midday canopy temperature for early stress detection."
      }
    ];
  }, [currentWeather.humidity, currentWeather.rainfall, currentWeather.temperature, forecast, selectedCrop]);

  const aiFarmingAlerts = useMemo(() => {
    const alerts = [];

    if (currentWeather.humidity >= 80) {
      alerts.push({
        severity: "high",
        text: "Risk of fungal disease due to high humidity",
        action: "Avoid evening overhead irrigation and monitor leaves for spots."
      });
    }

    if (Math.max(currentWeather.temperature, ...forecast.map((row) => row.temperature)) >= 37) {
      alerts.push({
        severity: "high",
        text: "Heat stress risk for crops",
        action: "Apply moisture conservation methods and schedule irrigation early."
      });
    }

    if ((forecast[0] || {}).rainProbability >= 60) {
      alerts.push({
        severity: "medium",
        text: "Rainfall expected - avoid pesticide spray",
        action: "Move spray operations to a dry weather window."
      });
    }

    if (currentWeather.windSpeed >= 24) {
      alerts.push({
        severity: "medium",
        text: "High wind drift risk",
        action: "Postpone foliar application to reduce drift and wastage."
      });
    }

    return alerts.length
      ? alerts
      : [
          {
            severity: "low",
            text: "No severe climate alert in the next 24 hours",
            action: "Continue regular monitoring and irrigation schedule."
          }
        ];
  }, [currentWeather, forecast]);

  const sourceBadge =
    dataSource === "api"
      ? "Live API"
      : dataSource === "cache"
        ? "Cached"
        : "Predictive Fallback";

  return (
    <div className="weather-intelligence-page relative min-h-screen overflow-hidden bg-[#EBF4FA] px-4 py-6 sm:px-6 lg:px-8">
      <style>{`
        .weather-intelligence-page {
          --sky: ${palette.sky};
          --green: ${palette.green};
          --yellow: ${palette.yellow};
          --cloud: ${palette.cloud};
          --ink: ${palette.ink};
          font-family: "Sora", "Nunito", "Segoe UI", sans-serif;
        }

        .weather-glass {
          background: linear-gradient(160deg, rgba(255, 255, 255, 0.78) 0%, rgba(238, 245, 250, 0.58) 100%);
          border: 1px solid rgba(56, 182, 255, 0.26);
          backdrop-filter: blur(14px);
        }

        .weather-badge {
          border: 1px solid rgba(18, 65, 90, 0.15);
          background: rgba(255, 255, 255, 0.7);
        }
      `}</style>

      <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[#85D2FF] opacity-35 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-24 h-80 w-80 rounded-full bg-[#9CE0B2] opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#FFE79D] opacity-28 blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-5">
        <Motion.section
          custom={1}
          initial="hidden"
          animate="visible"
          variants={sectionVariant}
          className="weather-glass rounded-3xl border px-5 py-6 shadow-[0_30px_60px_-42px_rgba(7,61,95,0.65)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="inline-flex items-center rounded-full bg-white/75 px-3 py-1 text-xs font-semibold text-[#176086]">
                Smart Weather Decision System
              </p>
              <h1 className="text-3xl font-black tracking-tight text-[#0F3F5A] sm:text-4xl">Weather Intelligence</h1>
              <p className="text-base font-semibold text-[#226483]">
                Real-time weather insights for smarter farming decisions.
              </p>
              <p className="max-w-3xl text-sm leading-relaxed text-[#2A6078]">
                Monitor weather conditions, forecast patterns, and AI-generated farming recommendations based on climate
                conditions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="weather-badge rounded-full px-3 py-1 text-[#1B5A7A]">{sourceBadge}</span>
              <span className="weather-badge rounded-full px-3 py-1 text-[#1B5A7A]">JWT Protected</span>
              <span className="weather-badge rounded-full px-3 py-1 text-[#1B5A7A]">Auto Refresh 3 min</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-[#245C76]">
            <span className="weather-badge rounded-full px-3 py-1">GET /api/weather/current</span>
            <span className="weather-badge rounded-full px-3 py-1">GET /api/weather/forecast</span>
            <span className="weather-badge rounded-full px-3 py-1">GET /api/weather/analysis</span>
          </div>
        </Motion.section>

        <Motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={sectionVariant}
          className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]"
        >
          <GlassCard
            title="Current Weather Panel"
            subtitle={`Live conditions for ${locationLabel}`}
            icon={CloudSun}
            action={
              <button
                type="button"
                onClick={() => loadWeather({ silent: false, force: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-[#9BD3F8] bg-white/80 px-3 py-2 text-xs font-bold text-[#1B607F]"
              >
                <RefreshCcw size={14} className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? "Refreshing" : "Refresh"}
              </button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-[0.95fr,1.05fr]">
              <div className="rounded-2xl border border-[#B9E1FA] bg-linear-to-br from-[#D8F1FF] via-[#EDF8FF] to-[#E9F7F0] p-4">
                <div className="flex items-center gap-3">
                  <WeatherGlyph condition={currentWeather.condition} size={48} />
                  <div>
                    <p className="text-4xl font-black text-[#0C4766]">{currentWeather.temperature} C</p>
                    <p className="text-sm font-semibold text-[#236482]">{String(currentWeather.condition)}</p>
                    <p className="text-xs text-[#2A6078]">Feels like {currentWeather.feelsLike} C</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-white/80 px-3 py-2 text-xs text-[#2E6279]">
                  Last sync: {lastUpdated ? lastUpdated.toLocaleTimeString() : "Waiting for first sync"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/80 p-3">
                  <p className="mb-1 inline-flex items-center gap-1 text-xs text-[#2B5D76]">
                    <Droplets size={14} />
                    Humidity
                  </p>
                  <p className="text-2xl font-black text-[#0D4766]">{currentWeather.humidity}%</p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <p className="mb-1 inline-flex items-center gap-1 text-xs text-[#2B5D76]">
                    <Wind size={14} />
                    Wind Speed
                  </p>
                  <p className="text-2xl font-black text-[#0D4766]">{currentWeather.windSpeed} km/h</p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <p className="mb-1 inline-flex items-center gap-1 text-xs text-[#2B5D76]">
                    <Umbrella size={14} />
                    Rain Probability
                  </p>
                  <p className="text-2xl font-black text-[#0D4766]">{currentWeather.rainfall}%</p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <p className="mb-1 inline-flex items-center gap-1 text-xs text-[#2B5D76]">
                    <Cloud size={14} />
                    Cloud Coverage
                  </p>
                  <p className="text-2xl font-black text-[#0D4766]">{currentWeather.cloudCoverage}%</p>
                </div>
                <div className="col-span-2 rounded-2xl bg-white/80 p-3">
                  <p className="mb-1 inline-flex items-center gap-1 text-xs text-[#2B5D76]">
                    <Gauge size={14} />
                    UV Index
                  </p>
                  <p className="text-2xl font-black text-[#0D4766]">{currentWeather.uvIndex}</p>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Farm Location Detection" subtitle="Use GPS or set farm location manually" icon={MapPin}>
            <form onSubmit={onManualSubmit} className="space-y-3">
              <label className="block text-sm font-semibold text-[#1B5D79]" htmlFor="farmLocationInput">
                Manual Farm Location
              </label>
              <input
                id="farmLocationInput"
                value={manualLocation}
                onChange={(event) => setManualLocation(event.target.value)}
                placeholder="Enter village, district, or farm name"
                className="w-full rounded-xl border border-[#A8D8F6] bg-white/80 px-3 py-2 text-sm text-[#124A67] outline-none transition focus:border-[#35A3E8]"
              />

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="submit"
                  className="rounded-xl bg-[#2EA4E8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#218BC8]"
                >
                  Use Manual Location
                </button>
                <button
                  type="button"
                  onClick={detectGps}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#9BD4A7] bg-[#E9F8ED] px-4 py-2 text-sm font-bold text-[#1F7A45] transition hover:bg-[#DBF3E2]"
                >
                  <LocateFixed size={16} />
                  Detect GPS
                </button>
              </div>
            </form>

            <div className="mt-4 space-y-2 rounded-2xl border border-[#B8DFF8] bg-white/75 p-3 text-sm text-[#245D77]">
              <p className="font-semibold">Active Weather Query</p>
              <p>
                Mode: <span className="font-bold">{locationMode === "gps" ? "GPS" : "Manual"}</span>
              </p>
              <p>
                Source: <span className="font-bold">{locationLabel}</span>
              </p>
            </div>

            {locationError ? (
              <div className="mt-3 rounded-xl border border-[#F5BEA9] bg-[#FFF3EE] px-3 py-2 text-sm text-[#A74727]">
                {locationError}
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 rounded-xl border border-[#F6D7A5] bg-[#FFF8E8] px-3 py-2 text-sm text-[#9A6119]">
                {error}
              </div>
            ) : null}
          </GlassCard>
        </Motion.div>

        <Motion.section custom={3} initial="hidden" animate="visible" variants={sectionVariant}>
          <GlassCard title="7-Day Weather Forecast" subtitle="Daily temperature, rain chance, and conditions" icon={CalendarDays}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {forecast.map((day) => (
                <Motion.article
                  key={`${day.dateISO}-${day.day}`}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="rounded-2xl border border-[#B7DEF6] bg-white/80 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2A617A]">{day.dayShort}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <WeatherGlyph condition={day.condition} size={26} />
                    <p className="text-lg font-black text-[#0D4765]">{day.temperature} C</p>
                  </div>
                  <p className="mt-2 text-xs text-[#295E77]">Rain: {day.rainProbability}%</p>
                  <p className="text-xs text-[#295E77]">Condition: {String(day.condition)}</p>
                </Motion.article>
              ))}
            </div>
          </GlassCard>
        </Motion.section>

        <Motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={sectionVariant}
          className="grid gap-4 lg:grid-cols-2"
        >
          <GlassCard
            title="Rainfall Prediction Chart"
            subtitle="Rain probability trend for irrigation and harvesting planning"
            icon={Waves}
          >
            <div className="h-72 rounded-2xl bg-white/75 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rainTrend}>
                  <defs>
                    <linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#39A4F6" stopOpacity={0.75} />
                      <stop offset="95%" stopColor="#39A4F6" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CFE4F3" />
                  <XAxis dataKey="day" stroke="#2E637B" />
                  <YAxis domain={[0, 100]} stroke="#2E637B" />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #D1E6F4", background: "#FFFFFF" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rain"
                    name="Rain Probability"
                    stroke="#2889D8"
                    fillOpacity={1}
                    fill="url(#rainFill)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard
            title="Temperature Trend Analysis"
            subtitle="Temperature and humidity trend across the next 7 days"
            icon={Thermometer}
          >
            <div className="h-72 rounded-2xl bg-white/75 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={climateTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CFE4F3" />
                  <XAxis dataKey="day" stroke="#2E637B" />
                  <YAxis yAxisId="left" stroke="#2E637B" />
                  <YAxis yAxisId="right" orientation="right" stroke="#2E637B" />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #D1E6F4", background: "#FFFFFF" }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="temperature"
                    name="Temperature"
                    stroke="#EA8A3D"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="humidity"
                    name="Humidity"
                    stroke="#2A9D5B"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </Motion.div>

        <Motion.div
          custom={5}
          initial="hidden"
          animate="visible"
          variants={sectionVariant}
          className="grid gap-4 lg:grid-cols-2"
        >
          <GlassCard
            title="Weather Risk Alerts"
            subtitle="Automated warnings to protect crops from climate shocks"
            icon={ShieldAlert}
          >
            <div className="space-y-3">
              {riskAlerts.length ? (
                riskAlerts.map((alert, index) => (
                  <article
                    key={`${alert.title}-${index}`}
                    className={`rounded-2xl border px-3 py-3 ${
                      alert.level === "high"
                        ? "border-[#F6B8AE] bg-[#FFF4F2]"
                        : "border-[#F6D9A0] bg-[#FFF8EC]"
                    }`}
                  >
                    <p className="inline-flex items-center gap-2 text-sm font-black text-[#114A67]">
                      <TriangleAlert size={16} />
                      {alert.title}
                    </p>
                    <p className="mt-1 text-sm text-[#2D5F76]">{alert.detail}</p>
                    <p className="mt-1 text-xs font-semibold text-[#1A5876]">Action: {alert.action}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-[#C6E4F7] bg-white/80 p-3 text-sm text-[#2A6078]">
                  No severe weather risk detected right now.
                </p>
              )}
            </div>
          </GlassCard>

          <GlassCard
            title="AI Weather-Based Farming Advice"
            subtitle="AI engine interpretation of forecast, humidity, and temperature"
            icon={BrainCircuit}
          >
            <p className="rounded-xl bg-white/80 px-3 py-2 text-sm text-[#2A6078]">AI Analysis: {analysis.summary}</p>
            <div className="mt-3 space-y-3">
              {aiAdvice.map((tip, index) => (
                <article key={`${tip.title}-${index}`} className="rounded-2xl border border-[#B7DEF6] bg-white/85 p-3">
                  <p className="text-sm font-black text-[#124D6B]">{tip.title}</p>
                  <p className="mt-1 text-sm text-[#2A6078]">{tip.insight}</p>
                  <p className="mt-1 text-sm font-semibold text-[#1D6E41]">Recommendation: {tip.action}</p>
                  <p className="mt-1 text-xs text-[#275F79]">Confidence: {tip.confidence}%</p>
                </article>
              ))}
            </div>
          </GlassCard>
        </Motion.div>

        <Motion.div
          custom={6}
          initial="hidden"
          animate="visible"
          variants={sectionVariant}
          className="grid gap-4 lg:grid-cols-2"
        >
          <GlassCard
            title="Crop Weather Impact Panel"
            subtitle="How current weather conditions can influence crop health"
            icon={Sprout}
            action={
              <select
                value={selectedCrop}
                onChange={(event) => setSelectedCrop(event.target.value)}
                className="rounded-xl border border-[#A7D8A8] bg-white/80 px-3 py-2 text-xs font-bold text-[#226943] outline-none"
              >
                {CROP_OPTIONS.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            }
          >
            <div className="space-y-3">
              {cropImpactRows.map((row, index) => (
                <article key={`${row.title}-${index}`} className="rounded-2xl border border-[#C3E3F6] bg-white/80 p-3">
                  <p className="text-sm font-black text-[#124D6B]">{row.title}</p>
                  <p className="mt-1 text-sm text-[#2A6078]">{row.effect}</p>
                  <p className="mt-1 text-xs font-semibold text-[#1C6E42]">Suggested action: {row.action}</p>
                </article>
              ))}
            </div>
          </GlassCard>

          <GlassCard
            title="Smart Irrigation Suggestions"
            subtitle="Decision support generated from rainfall, temperature, and humidity"
            icon={Droplets}
          >
            <div className="rounded-2xl border border-[#B9DFF8] bg-linear-to-br from-[#E9F8FF] to-[#F2FCF5] p-4">
              <p className="text-sm font-semibold text-[#226481]">Recommended irrigation level</p>
              <p className="text-3xl font-black text-[#0E4A67]">{irrigationPlan.level}</p>
              <div className="mt-3 grid gap-2 text-sm text-[#2A6078]">
                <p>
                  <span className="font-semibold">Timing:</span> {irrigationPlan.timing}
                </p>
                <p>
                  <span className="font-semibold">Frequency:</span> {irrigationPlan.frequency}
                </p>
                <p>
                  <span className="font-semibold">Reason:</span> {irrigationPlan.reason}
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-[#A6D6A8] bg-white/80 px-3 py-2 text-xs font-semibold text-[#1F6E42]">
                Recommended irrigation window prioritizes early morning to reduce evaporation and leaf wetness.
              </div>
            </div>
          </GlassCard>
        </Motion.div>

        <Motion.div
          custom={7}
          initial="hidden"
          animate="visible"
          variants={sectionVariant}
          className="grid gap-4 lg:grid-cols-2"
        >
          <GlassCard title="Weather History" subtitle="Last 7 days rainfall and temperature pattern" icon={History}>
            <div className="h-72 rounded-2xl bg-white/75 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={historyRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CFE4F3" />
                  <XAxis dataKey="day" stroke="#2E637B" />
                  <YAxis yAxisId="left" stroke="#2E637B" />
                  <YAxis yAxisId="right" orientation="right" stroke="#2E637B" />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #D1E6F4", background: "#FFFFFF" }}
                  />
                  <Bar yAxisId="left" dataKey="rainfall" name="Rainfall" fill="#4DA4E8" radius={[6, 6, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="temperature"
                    name="Temperature"
                    stroke="#EA8A3D"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard title="AI Farming Alerts" subtitle="Actionable alerts generated from weather intelligence" icon={TriangleAlert}>
            <div className="space-y-3">
              {aiFarmingAlerts.map((alert, index) => (
                <article
                  key={`${alert.text}-${index}`}
                  className={`rounded-2xl border px-3 py-3 ${
                    alert.severity === "high"
                      ? "border-[#F6B8AE] bg-[#FFF4F2]"
                      : alert.severity === "medium"
                        ? "border-[#F6D7A5] bg-[#FFF8E8]"
                        : "border-[#BFE4C7] bg-[#F2FCF5]"
                  }`}
                >
                  <p className="text-sm font-black text-[#124D6B]">{alert.text}</p>
                  <p className="mt-1 text-sm text-[#2A6078]">{alert.action}</p>
                </article>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[#B7DEF6] bg-white/80 p-3 text-xs text-[#2A6078]">
              AI score: <span className="font-bold">{analysis.riskScore}/100</span> climate risk. Irrigation hint: {analysis.irrigationHint}
            </div>
          </GlassCard>
        </Motion.div>

        {isLoading ? (
          <Motion.div custom={8} initial="hidden" animate="visible" variants={sectionVariant}>
            <div className="weather-glass rounded-2xl border p-3 text-center text-sm font-semibold text-[#2A6078]">
              Loading weather intelligence modules...
            </div>
          </Motion.div>
        ) : null}
      </div>
    </div>
  );
};

export default WeatherIntelligence;

