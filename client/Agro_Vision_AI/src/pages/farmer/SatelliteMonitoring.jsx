import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarDays,
  CloudRain,
  Compass,
  Download,
  Droplets,
  FlaskConical,
  Gauge,
  Layers3,
  Leaf,
  LoaderCircle,
  MapPinned,
  Move3D,
  RefreshCw,
  ShieldCheck,
  SunMedium,
  ThermometerSun,
  UploadCloud,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const CACHE_KEY = "agv:satellite-monitoring:v1";
const CACHE_TTL_MS = 1000 * 60 * 10;

const ENDPOINTS = {
  ndvi: "/satellite/ndvi",
  farmBoundary: "/satellite/farm-boundary",
  vegetation: "/satellite/vegetation-analysis",
  weather: "/weather/current",
};

const NDVI_BANDS = [
  { range: "0.8 - 1.0", label: "Very Healthy", color: "#1f7a3a" },
  { range: "0.6 - 0.8", label: "Healthy", color: "#4eaf50" },
  { range: "0.4 - 0.6", label: "Moderate", color: "#d9bd3c" },
  { range: "0.2 - 0.4", label: "Stressed", color: "#e88f3a" },
  { range: "0.0 - 0.2", label: "Poor Vegetation", color: "#c53d35" },
];

const FLOW_STEPS = [
  "Load farm boundary",
  "Fetch satellite NDVI tiles",
  "Overlay NDVI heatmap",
  "Detect vegetation stress zones",
  "Blend weather + NDVI context",
  "Generate AI recommendations",
];

const MOTION_ENABLED = typeof motion === "object";

const FALLBACK_DASHBOARD = {
  boundary: {
    farmName: "North Ridge Farm",
    areaHectares: 26.4,
    boundaryPoints: [
      { x: 15, y: 22 },
      { x: 68, y: 18 },
      { x: 86, y: 44 },
      { x: 73, y: 78 },
      { x: 28, y: 82 },
      { x: 10, y: 56 },
    ],
  },
  ndvi: {
    average: 0.67,
    trend: Array.from({ length: 30 }, (_, index) => {
      const value = 0.61 + Math.sin(index * 0.22) * 0.08 + Math.cos(index * 0.13) * 0.03;
      return {
        day: `D-${29 - index}`,
        value: Number(Math.min(0.92, Math.max(0.18, value)).toFixed(2)),
      };
    }),
    capturedAt: new Date().toISOString(),
    source: "Sentinel-2 simulated stream",
  },
  analysis: {
    zones: [
      {
        zone: "A",
        label: "North Canopy",
        ndvi: 0.81,
        area: 38,
        health: "Very Healthy",
        stressType: "None",
        centroid: { x: 29, y: 35 },
        recommendation: "Maintain current irrigation and continue weekly scouting.",
      },
      {
        zone: "B",
        label: "Central Belt",
        ndvi: 0.54,
        area: 27,
        health: "Moderate",
        stressType: "Water Stress",
        centroid: { x: 53, y: 45 },
        recommendation: "Increase irrigation by 12 percent for the next 5 days.",
      },
      {
        zone: "C",
        label: "South Edge",
        ndvi: 0.33,
        area: 18,
        health: "Stressed",
        stressType: "Nutrient Deficiency",
        centroid: { x: 67, y: 64 },
        recommendation: "Apply nitrogen-rich foliar feed and re-evaluate in 72 hours.",
      },
      {
        zone: "D",
        label: "West Pocket",
        ndvi: 0.69,
        area: 17,
        health: "Healthy",
        stressType: "Pest Risk",
        centroid: { x: 37, y: 67 },
        recommendation: "Inspect leaf undersides for pests and deploy bio-control traps.",
      },
    ],
    aiInsights: [
      "Zone A maintains a strong vegetation signature and stable biomass growth.",
      "Zone B indicates possible water stress with progressive NDVI decline.",
      "Zone C has nutrient-deficiency risk and needs corrective feeding.",
    ],
    recommendations: [
      "Increase irrigation frequency in zone B between 5:00-7:00 AM.",
      "Apply split nitrogen dose in low-NDVI strips around zone C.",
      "Run targeted pest scouting in the west boundary before sunset.",
    ],
    alerts: [
      {
        severity: "high",
        title: "Vegetation drop detected",
        message: "NDVI decline of 0.09 observed in zone C over the last 7 days.",
      },
      {
        severity: "medium",
        title: "Possible drought stress",
        message: "High evapotranspiration and low moisture signal in central field.",
      },
      {
        severity: "low",
        title: "Early pest signature",
        message: "West pocket showing mild canopy disruption pattern.",
      },
    ],
  },
  weatherImpact: {
    temperature: 33,
    humidity: 70,
    rainfall: 5,
    insight: "High temperature and low rainfall may intensify stress in zone C.",
  },
  sources: {
    satellite: "Sentinel-2 + Landsat-8 simulated feed",
    engine: "FastAPI AI vegetation intelligence",
    security: "JWT-protected satellite endpoints",
  },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const numberOr = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const statusFromNdvi = (value) => {
  if (value >= 0.8) return "Very Healthy";
  if (value >= 0.6) return "Healthy";
  if (value >= 0.4) return "Moderate";
  if (value >= 0.2) return "Stressed";
  return "Poor Vegetation";
};

const zoneColor = (health) => {
  const text = String(health || "").toLowerCase();
  if (text.includes("very") || text.includes("healthy")) return "#2f9e44";
  if (text.includes("moderate")) return "#d2a834";
  if (text.includes("stress")) return "#dc5c3e";
  return "#7f8a97";
};

const stressBadgeClass = (stressType) => {
  const text = String(stressType || "").toLowerCase();
  if (text.includes("none")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (text.includes("water") || text.includes("drought")) return "bg-sky-100 text-sky-700 border-sky-200";
  if (text.includes("nutrient")) return "bg-amber-100 text-amber-700 border-amber-200";
  if (text.includes("pest")) return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const severityClass = (severity) => {
  const text = String(severity || "").toLowerCase();
  if (text === "high") {
    return {
      container: "border-rose-200 bg-rose-50",
      badge: "bg-rose-100 text-rose-700",
      icon: AlertTriangle,
    };
  }

  if (text === "medium") {
    return {
      container: "border-amber-200 bg-amber-50",
      badge: "bg-amber-100 text-amber-700",
      icon: AlertTriangle,
    };
  }

  return {
    container: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    icon: ShieldCheck,
  };
};

const readCache = () => {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || !parsed.value) return null;

    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;

    return parsed.value;
  } catch {
    return null;
  }
};

const writeCache = (value) => {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        value,
      })
    );
  } catch {
    // Ignore quota/private mode failures.
  }
};

const polygonArea = (points) => {
  if (!Array.isArray(points) || points.length < 3) return 0;

  let total = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = (index + 1) % points.length;
    total += points[index].x * points[next].y;
    total -= points[next].x * points[index].y;
  }

  return Math.abs(total / 2);
};

const sanitizePoints = (points) => {
  if (!Array.isArray(points)) return [];

  return points
    .map((point) => ({
      x: clamp(numberOr(point.x, 0), 2, 98),
      y: clamp(numberOr(point.y, 0), 2, 98),
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
};

const geoToPercentPoints = (coordinates) => {
  const rows = Array.isArray(coordinates)
    ? coordinates
        .map((pair) => {
          if (!Array.isArray(pair) || pair.length < 2) return null;
          const lon = Number(pair[0]);
          const lat = Number(pair[1]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
          return [lon, lat];
        })
        .filter(Boolean)
    : [];

  if (rows.length < 3) return [];

  const minLon = Math.min(...rows.map((row) => row[0]));
  const maxLon = Math.max(...rows.map((row) => row[0]));
  const minLat = Math.min(...rows.map((row) => row[1]));
  const maxLat = Math.max(...rows.map((row) => row[1]));

  const lonSpan = Math.max(0.000001, maxLon - minLon);
  const latSpan = Math.max(0.000001, maxLat - minLat);

  return rows.map(([lon, lat]) => ({
    x: Number((12 + ((lon - minLon) / lonSpan) * 76).toFixed(2)),
    y: Number((82 - ((lat - minLat) / latSpan) * 64).toFixed(2)),
  }));
};

const parseBoundaryGeoJson = (raw) => {
  const parsed = JSON.parse(raw);
  let geometry = parsed;

  if (parsed?.type === "FeatureCollection") {
    geometry = parsed.features?.[0]?.geometry;
  } else if (parsed?.type === "Feature") {
    geometry = parsed.geometry;
  }

  if (!geometry) {
    throw new Error("GeoJSON geometry not found.");
  }

  let coordinates = [];

  if (geometry.type === "Polygon") {
    coordinates = geometry.coordinates?.[0] || [];
  } else if (geometry.type === "MultiPolygon") {
    coordinates = geometry.coordinates?.[0]?.[0] || [];
  } else {
    throw new Error("Only Polygon or MultiPolygon is supported.");
  }

  const points = geoToPercentPoints(coordinates);
  if (points.length < 3) {
    throw new Error("Polygon requires at least 3 valid coordinates.");
  }

  return points;
};

const parseGpsCoordinateText = (raw) => {
  const rows = String(raw || "")
    .split(/[\n;]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 3) {
    throw new Error("Enter at least 3 lat,lon pairs.");
  }

  const coordinates = rows.map((row) => {
    const [latText, lonText] = row.split(",").map((value) => value.trim());
    const lat = Number(latText);
    const lon = Number(lonText);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error("Invalid coordinate format. Use lat,lon per line.");
    }

    return [lon, lat];
  });

  const points = geoToPercentPoints(coordinates);
  if (points.length < 3) {
    throw new Error("Could not map coordinates to a valid polygon.");
  }

  return points;
};

const normalizeBoundary = (rawBoundary) => {
  const fallback = FALLBACK_DASHBOARD.boundary;

  const farmName = rawBoundary?.farmName || rawBoundary?.name || fallback.farmName;
  const areaHectares = numberOr(rawBoundary?.areaHectares ?? rawBoundary?.area, fallback.areaHectares);

  let points = [];

  if (Array.isArray(rawBoundary?.boundaryPoints)) {
    points = sanitizePoints(rawBoundary.boundaryPoints);
  }

  if (points.length < 3 && rawBoundary?.farmBoundary?.type) {
    try {
      const geometry =
        rawBoundary.farmBoundary.type === "Feature"
          ? rawBoundary.farmBoundary.geometry
          : rawBoundary.farmBoundary;

      if (geometry?.type === "Polygon") {
        points = geoToPercentPoints(geometry.coordinates?.[0] || []);
      } else if (geometry?.type === "MultiPolygon") {
        points = geoToPercentPoints(geometry.coordinates?.[0]?.[0] || []);
      }
    } catch {
      points = [];
    }
  }

  if (points.length < 3) {
    points = fallback.boundaryPoints;
  }

  return {
    farmName,
    areaHectares,
    boundaryPoints: points,
  };
};

const normalizeNdvi = (rawNdvi) => {
  const fallback = FALLBACK_DASHBOARD.ndvi;

  const average = clamp(numberOr(rawNdvi?.ndviAverage ?? rawNdvi?.average, fallback.average), 0, 1);

  const trendSource =
    (Array.isArray(rawNdvi?.trend) && rawNdvi.trend) ||
    (Array.isArray(rawNdvi?.ndviTrend) && rawNdvi.ndviTrend) ||
    fallback.trend;

  const trend = trendSource.slice(-30).map((point, index) => ({
    day: point?.day || point?.label || `D-${29 - index}`,
    value: clamp(numberOr(point?.value ?? point?.ndvi, average), 0, 1),
  }));

  return {
    average,
    trend,
    capturedAt: rawNdvi?.capturedAt || rawNdvi?.timestamp || fallback.capturedAt,
    source: rawNdvi?.source || fallback.source,
  };
};

const normalizeWeatherImpact = (rawWeather) => {
  const fallback = FALLBACK_DASHBOARD.weatherImpact;

  const temperature = numberOr(rawWeather?.temperature ?? rawWeather?.temp, fallback.temperature);
  const humidity = clamp(numberOr(rawWeather?.humidity, fallback.humidity), 0, 100);

  const rainfallFromRaw = numberOr(rawWeather?.rainfall, NaN);
  const rainProbability = numberOr(rawWeather?.rainProbability ?? rawWeather?.rainChance, NaN);

  const rainfall = Number.isFinite(rainfallFromRaw)
    ? rainfallFromRaw
    : Number.isFinite(rainProbability)
    ? Number((rainProbability * 0.12).toFixed(1))
    : fallback.rainfall;

  return {
    temperature,
    humidity,
    rainfall,
    insight: rawWeather?.insight || fallback.insight,
  };
};

const normalizeAnalysis = (rawAnalysis, fallbackWeatherImpact) => {
  const fallback = FALLBACK_DASHBOARD.analysis;

  const baseZones = fallback.zones.map((zone) => ({ ...zone }));

  const zoneRows =
    (Array.isArray(rawAnalysis?.zones) && rawAnalysis.zones) ||
    (Array.isArray(rawAnalysis?.stressZones) && rawAnalysis.stressZones) ||
    [];

  if (zoneRows.length > 0) {
    zoneRows.forEach((row, index) => {
      const zoneId = String(row?.zone || row?.id || "").toUpperCase();
      const existingIndex = baseZones.findIndex((zone) => zone.zone === zoneId);
      const targetIndex = existingIndex >= 0 ? existingIndex : index % baseZones.length;
      const existing = baseZones[targetIndex];

      const ndviValue = clamp(numberOr(row?.ndvi, existing.ndvi), 0, 1);

      baseZones[targetIndex] = {
        ...existing,
        zone: zoneId || existing.zone,
        label: row?.label || row?.name || existing.label,
        ndvi: ndviValue,
        area: numberOr(row?.area, existing.area),
        health: row?.health || statusFromNdvi(ndviValue),
        stressType: row?.stressType || row?.risk || existing.stressType,
        centroid: {
          x: clamp(numberOr(row?.centroid?.x, existing.centroid.x), 4, 96),
          y: clamp(numberOr(row?.centroid?.y, existing.centroid.y), 4, 96),
        },
        recommendation: row?.recommendation || existing.recommendation,
      };
    });
  }

  const alerts =
    (Array.isArray(rawAnalysis?.alerts) && rawAnalysis.alerts) ||
    fallback.alerts;

  const recommendations =
    (Array.isArray(rawAnalysis?.recommendations) && rawAnalysis.recommendations) ||
    fallback.recommendations;

  const aiInsights =
    (Array.isArray(rawAnalysis?.aiInsights) && rawAnalysis.aiInsights) ||
    baseZones
      .slice(0, 3)
      .map(
        (zone) =>
          `Zone ${zone.zone} (${zone.label}) NDVI ${zone.ndvi.toFixed(2)} indicates ${String(zone.health).toLowerCase()} vegetation.`
      );

  const weatherImpact = normalizeWeatherImpact(rawAnalysis?.weatherImpact || fallbackWeatherImpact);

  return {
    zones: baseZones,
    alerts,
    recommendations,
    aiInsights,
    weatherImpact,
  };
};

const normalizeDashboard = ({ boundaryRaw, ndviRaw, vegetationRaw, weatherRaw }) => {
  const boundary = normalizeBoundary(boundaryRaw);
  const ndvi = normalizeNdvi(ndviRaw);
  const weatherImpact = normalizeWeatherImpact(weatherRaw);
  const analysis = normalizeAnalysis(vegetationRaw, weatherImpact);

  return {
    boundary,
    ndvi,
    analysis,
    weatherImpact: analysis.weatherImpact,
    sources: FALLBACK_DASHBOARD.sources,
  };
};

const escapePdfText = (value) => {
  const source = String(value);
  let cleaned = "";

  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    cleaned += code < 32 || code === 127 ? " " : source[index];
  }

  return cleaned
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
};

const createPdfBlob = (title, lines) => {
  const content = ["BT", "/F1 11 Tf", "40 790 Td", `(${escapePdfText(title)}) Tj`, "0 -18 Td"];

  lines.forEach((line) => {
    content.push(`(${escapePdfText(line)}) Tj`);
    content.push("0 -14 Td");
  });

  content.push("ET");

  const contentStream = content.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
};

const SectionHeader = ({ icon: Icon, title, subtitle, rightSlot }) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <h2 className="inline-flex items-center gap-2 text-lg sm:text-xl font-black tracking-tight text-[#193f2c]">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#e5f3e8] text-[#1f7a3a]">
          {React.createElement(Icon, { size: 16 })}
        </span>
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-sm text-[#4a6b59]">{subtitle}</p> : null}
    </div>
    {rightSlot || null}
  </div>
);

const SatelliteMonitoring = () => {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(FALLBACK_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [mapReady, setMapReady] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const [layerVisibility, setLayerVisibility] = useState({
    satellite: true,
    ndvi: true,
    heatmap: true,
    boundary: true,
  });

  const [drawMode, setDrawMode] = useState(false);
  const [draftPoints, setDraftPoints] = useState([]);
  const [gpsInput, setGpsInput] = useState("");
  const [geoJsonInput, setGeoJsonInput] = useState("");
  const [toolMessage, setToolMessage] = useState("");

  const [selectedZone, setSelectedZone] = useState("A");

  const mapRef = useRef(null);
  const panRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setMapReady(true), 280);
    return () => window.clearTimeout(timer);
  }, []);

  const loadSatelliteData = useCallback(async ({ force = false, background = false } = {}) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (!force) {
        const cached = readCache();
        if (cached) {
          setDashboard(cached);
          if (!background) {
            setLoading(false);
          }
        }
      }

      const [boundaryResult, ndviResult, vegetationResult, weatherResult] = await Promise.allSettled([
        api.get(ENDPOINTS.farmBoundary).then((response) => response.data),
        api.get(ENDPOINTS.ndvi).then((response) => response.data),
        api.get(ENDPOINTS.vegetation).then((response) => response.data),
        api.get(ENDPOINTS.weather).then((response) => response.data),
      ]);

      const normalized = normalizeDashboard({
        boundaryRaw: boundaryResult.status === "fulfilled" ? boundaryResult.value : null,
        ndviRaw: ndviResult.status === "fulfilled" ? ndviResult.value : null,
        vegetationRaw: vegetationResult.status === "fulfilled" ? vegetationResult.value : null,
        weatherRaw: weatherResult.status === "fulfilled" ? weatherResult.value : null,
      });

      setDashboard(normalized);
      writeCache(normalized);

      const failedCalls = [boundaryResult, ndviResult, vegetationResult, weatherResult].filter(
        (result) => result.status === "rejected"
      ).length;

      if (failedCalls > 0) {
        setErrorMessage("Some satellite services are temporarily unavailable. Showing blended live + cached analytics.");
      } else {
        setErrorMessage("");
      }
    } catch {
      setDashboard(FALLBACK_DASHBOARD);
      setErrorMessage("Unable to load live satellite analytics. Showing secure fallback simulation data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSatelliteData();
  }, [loadSatelliteData]);

  const boundaryPoints = useMemo(
    () => sanitizePoints(dashboard.boundary.boundaryPoints),
    [dashboard.boundary.boundaryPoints]
  );

  const zoneRows = useMemo(() => dashboard.analysis.zones || [], [dashboard.analysis.zones]);

  const selectedZoneData = useMemo(() => {
    return zoneRows.find((zone) => zone.zone === selectedZone) || zoneRows[0] || null;
  }, [selectedZone, zoneRows]);

  const stressRows = useMemo(
    () =>
      zoneRows.filter(
        (zone) =>
          String(zone.stressType || "") &&
          !String(zone.stressType || "").toLowerCase().includes("none")
      ),
    [zoneRows]
  );

  const ndviAverage = dashboard.ndvi.average;
  const ndviPercent = clamp(((ndviAverage - 0) / 1) * 100, 0, 100);

  const ndviStatus = statusFromNdvi(ndviAverage);

  const zoneShareTotal = useMemo(
    () => zoneRows.reduce((sum, zone) => sum + numberOr(zone.area, 0), 0),
    [zoneRows]
  );

  const comparisonData = useMemo(() => {
    const trend = dashboard.ndvi.trend;
    if (!Array.isArray(trend) || trend.length === 0) {
      return [
        { label: "Today", value: ndviAverage, delta: 0 },
        { label: "Last Week", value: ndviAverage - 0.04, delta: -0.04 },
        { label: "Last Month", value: ndviAverage - 0.08, delta: -0.08 },
      ];
    }

    const today = trend[trend.length - 1].value;
    const weekSlice = trend.slice(Math.max(0, trend.length - 8), trend.length - 1);
    const monthSlice = trend.slice(0, Math.max(1, trend.length - 20));

    const weekAvg =
      weekSlice.reduce((sum, row) => sum + numberOr(row.value, today), 0) /
      Math.max(1, weekSlice.length);
    const monthAvg =
      monthSlice.reduce((sum, row) => sum + numberOr(row.value, today), 0) /
      Math.max(1, monthSlice.length);

    return [
      { label: "Today", value: today, delta: 0 },
      { label: "Last Week", value: weekAvg, delta: weekAvg - today },
      { label: "Last Month", value: monthAvg, delta: monthAvg - today },
    ];
  }, [dashboard.ndvi.trend, ndviAverage]);

  const pointerToPercent = useCallback(
    (clientX, clientY) => {
      const element = mapRef.current;
      if (!element) return null;

      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;

      const localX = (clientX - rect.left - mapOffset.x) / mapZoom;
      const localY = (clientY - rect.top - mapOffset.y) / mapZoom;

      const x = clamp((localX / rect.width) * 100, 2, 98);
      const y = clamp((localY / rect.height) * 100, 2, 98);

      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      };
    },
    [mapOffset.x, mapOffset.y, mapZoom]
  );

  const onMapClick = (event) => {
    if (!drawMode) return;

    const point = pointerToPercent(event.clientX, event.clientY);
    if (!point) return;

    setDraftPoints((previous) => [...previous, point]);
    setToolMessage(`Point ${draftPoints.length + 1} added.`);
  };

  const onMapPointerDown = (event) => {
    if (drawMode) return;

    panRef.current.active = true;
    panRef.current.startX = event.clientX;
    panRef.current.startY = event.clientY;
    panRef.current.originX = mapOffset.x;
    panRef.current.originY = mapOffset.y;

    setIsPanning(true);

    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const onMapPointerMove = (event) => {
    if (!panRef.current.active || drawMode) return;

    const deltaX = event.clientX - panRef.current.startX;
    const deltaY = event.clientY - panRef.current.startY;

    setMapOffset({
      x: clamp(panRef.current.originX + deltaX, -220, 220),
      y: clamp(panRef.current.originY + deltaY, -220, 220),
    });
  };

  const endPan = () => {
    panRef.current.active = false;
    setIsPanning(false);
  };

  const commitBoundary = () => {
    if (draftPoints.length < 3) {
      setToolMessage("At least 3 points are required to form a polygon.");
      return;
    }

    const cleaned = sanitizePoints(draftPoints);
    const areaPercent = polygonArea(cleaned);
    const inferredArea = Number((Math.max(4, areaPercent * 0.03)).toFixed(2));

    setDashboard((previous) => ({
      ...previous,
      boundary: {
        ...previous.boundary,
        boundaryPoints: cleaned,
        areaHectares: inferredArea,
      },
    }));

    setDraftPoints([]);
    setDrawMode(false);
    setToolMessage("Farm boundary updated from drawn polygon.");
  };

  const clearBoundary = () => {
    setDraftPoints([]);
    setDashboard((previous) => ({
      ...previous,
      boundary: {
        ...previous.boundary,
        boundaryPoints: FALLBACK_DASHBOARD.boundary.boundaryPoints,
        areaHectares: FALLBACK_DASHBOARD.boundary.areaHectares,
      },
    }));
    setToolMessage("Farm boundary reset to baseline boundary.");
  };

  const importGpsBoundary = () => {
    try {
      const points = parseGpsCoordinateText(gpsInput);
      const areaPercent = polygonArea(points);
      const inferredArea = Number((Math.max(4, areaPercent * 0.03)).toFixed(2));

      setDashboard((previous) => ({
        ...previous,
        boundary: {
          ...previous.boundary,
          boundaryPoints: points,
          areaHectares: inferredArea,
        },
      }));

      setDraftPoints([]);
      setToolMessage("Boundary imported from GPS coordinates.");
    } catch (error) {
      setToolMessage(error.message || "Unable to parse GPS coordinates.");
    }
  };

  const importGeoJsonBoundary = () => {
    try {
      const points = parseBoundaryGeoJson(geoJsonInput);
      const areaPercent = polygonArea(points);
      const inferredArea = Number((Math.max(4, areaPercent * 0.03)).toFixed(2));

      setDashboard((previous) => ({
        ...previous,
        boundary: {
          ...previous.boundary,
          boundaryPoints: points,
          areaHectares: inferredArea,
        },
      }));

      setDraftPoints([]);
      setToolMessage("Boundary imported from GeoJSON successfully.");
    } catch (error) {
      setToolMessage(error.message || "Unable to parse GeoJSON polygon.");
    }
  };

  const toggleLayer = (key) => {
    setLayerVisibility((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const resetMapView = () => {
    setMapZoom(1);
    setMapOffset({ x: 0, y: 0 });
  };

  const exportPdfReport = () => {
    const lines = [
      `Farmer: ${user?.name || "Farmer"}`,
      `Farm: ${dashboard.boundary.farmName}`,
      `Area (ha): ${dashboard.boundary.areaHectares}`,
      `NDVI Average: ${dashboard.ndvi.average.toFixed(2)} (${ndviStatus})`,
      `Captured At: ${new Date(dashboard.ndvi.capturedAt).toLocaleString()}`,
      "",
      "Zone Breakdown:",
      ...zoneRows.map(
        (zone) =>
          `Zone ${zone.zone}: NDVI ${zone.ndvi.toFixed(2)}, ${zone.health}, Stress: ${zone.stressType}, Area: ${zone.area}%`
      ),
      "",
      "AI Recommendations:",
      ...dashboard.analysis.recommendations.map((item, index) => `${index + 1}. ${item}`),
      "",
      "Alerts:",
      ...dashboard.analysis.alerts.map(
        (alert, index) => `${index + 1}. [${alert.severity.toUpperCase()}] ${alert.title} - ${alert.message}`
      ),
      "",
      `Weather Impact: Temp ${dashboard.weatherImpact.temperature}C, Humidity ${dashboard.weatherImpact.humidity}%, Rainfall ${dashboard.weatherImpact.rainfall}mm`,
      `AI Insight: ${dashboard.weatherImpact.insight}`,
    ];

    const blob = createPdfBlob("AgroVision Satellite Crop Health Report", lines);
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `satellite-crop-health-report-${Date.now()}.pdf`;
    anchor.click();

    URL.revokeObjectURL(url);
  };

  if (loading && !dashboard) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#edf1ec] text-[#254f3a]">
        <p className="inline-flex items-center gap-2 text-sm font-semibold">
          <LoaderCircle size={16} className="animate-spin" />
          Loading satellite intelligence...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6 lg:px-8"
      data-motion={MOTION_ENABLED ? "enabled" : "disabled"}
      style={{
        background:
          "radial-gradient(circle at 6% 4%, rgba(78, 175, 80, 0.14), transparent 32%), radial-gradient(circle at 93% 0, rgba(136, 82, 39, 0.14), transparent 30%), linear-gradient(180deg, #eef2ed 0%, #f8faf7 100%)",
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
      }}
    >
      <div className="mx-auto max-w-375 space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-[28px] border border-[#d8e6db] bg-white/72 backdrop-blur-xl shadow-[0_20px_55px_-34px_rgba(22,76,44,0.62)] p-5 sm:p-7"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#d6e7da] bg-[#f2fbf4] px-3 py-1 text-xs font-bold uppercase tracking-[0.11em] text-[#2b7841]">
                <MapPinned size={13} />
                Precision Agriculture Monitoring
              </p>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-[2.1rem] font-black tracking-tight text-[#173c29]">
                Satellite Crop Monitoring
              </h1>
              <p className="mt-1 text-sm sm:text-base text-[#476857]">
                Monitor crop health using satellite imagery and vegetation index analysis.
              </p>
              <p className="mt-2 text-sm text-[#5a7a68] max-w-3xl">
                Advanced satellite analytics detect vegetation stress and crop health conditions across your fields.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadSatelliteData({ force: true, background: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-[#cce2d1] bg-white px-3 py-2 text-sm font-semibold text-[#245f37] hover:bg-[#f3faf4] transition"
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Syncing" : "Refresh"}
              </button>
              <button
                type="button"
                onClick={exportPdfReport}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2f7a3e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#276633] transition"
              >
                <Download size={15} />
                Export Crop Health Report
              </button>
            </div>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {errorMessage}
            </p>
          ) : null}
        </motion.section>

        <div className="grid gap-6 xl:grid-cols-[1.62fr,0.88fr]">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-[26px] border border-[#d7e6dc] bg-white/72 backdrop-blur-xl shadow-[0_20px_50px_-34px_rgba(18,68,42,0.58)] p-5 sm:p-6"
          >
            <SectionHeader
              icon={Layers3}
              title="Interactive Satellite Map"
              subtitle="Satellite imagery + NDVI layer + crop stress heatmap"
              rightSlot={
                <div className="inline-flex items-center rounded-xl border border-[#d9e8dc] bg-white px-2 py-1 text-xs text-[#4c6e5d]">
                  <CalendarDays size={13} className="mr-1" />
                  Captured {new Date(dashboard.ndvi.capturedAt).toLocaleDateString()}
                </div>
              }
            />

            <div className="mt-4 rounded-2xl border border-[#d6e7da] overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-[#d6e7da] bg-[#f8fbf8] px-3 py-2 text-xs">
                {[
                  { key: "satellite", label: "Satellite" },
                  { key: "ndvi", label: "NDVI" },
                  { key: "heatmap", label: "Heatmap" },
                  { key: "boundary", label: "Boundary" },
                ].map((layer) => (
                  <button
                    key={layer.key}
                    type="button"
                    onClick={() => toggleLayer(layer.key)}
                    className={`rounded-full border px-3 py-1 font-semibold transition ${
                      layerVisibility[layer.key]
                        ? "border-[#b6d8bf] bg-[#e8f6ec] text-[#236a39]"
                        : "border-[#d7e5da] bg-white text-[#617c6d]"
                    }`}
                  >
                    {layer.label}
                  </button>
                ))}

                <div className="ml-auto inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMapZoom((value) => clamp(Number((value + 0.1).toFixed(2)), 0.7, 2.8))}
                    className="rounded-lg border border-[#cfe1d3] bg-white p-1.5 text-[#255f37] hover:bg-[#eff7f0]"
                    title="Zoom in"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapZoom((value) => clamp(Number((value - 0.1).toFixed(2)), 0.7, 2.8))}
                    className="rounded-lg border border-[#cfe1d3] bg-white p-1.5 text-[#255f37] hover:bg-[#eff7f0]"
                    title="Zoom out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={resetMapView}
                    className="rounded-lg border border-[#cfe1d3] bg-white p-1.5 text-[#255f37] hover:bg-[#eff7f0]"
                    title="Reset"
                  >
                    <Compass size={14} />
                  </button>
                </div>
              </div>

              <div
                ref={mapRef}
                className={`relative h-130 select-none ${drawMode ? "cursor-crosshair" : isPanning ? "cursor-grabbing" : "cursor-grab"}`}
                onClick={onMapClick}
                onPointerDown={onMapPointerDown}
                onPointerMove={onMapPointerMove}
                onPointerUp={endPan}
                onPointerCancel={endPan}
                onPointerLeave={endPan}
              >
                {!mapReady ? (
                  <div className="absolute inset-0 grid place-items-center bg-[#f0f5ef] text-[#3b684f]">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold">
                      <LoaderCircle size={15} className="animate-spin" />
                      Loading map tiles...
                    </p>
                  </div>
                ) : (
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapZoom})`,
                      transformOrigin: "center center",
                      transition: isPanning ? "none" : "transform 220ms ease",
                    }}
                  >
                    {layerVisibility.satellite ? (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_16%,#5f724b_0%,transparent_30%),radial-gradient(circle_at_78%_20%,#3f5a3a_0%,transparent_34%),radial-gradient(circle_at_44%_68%,#768c5a_0%,transparent_37%),linear-gradient(165deg,#4a6542_0%,#344a33_42%,#273a29_100%)]" />
                    ) : (
                      <div className="absolute inset-0 bg-[#2a392c]" />
                    )}

                    <div className="absolute inset-0 opacity-35 bg-[repeating-linear-gradient(27deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_2px,transparent_2px,transparent_12px)]" />

                    {layerVisibility.ndvi ? (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_36%,rgba(65,164,83,0.48)_0%,transparent_26%),radial-gradient(circle_at_61%_42%,rgba(218,181,60,0.42)_0%,transparent_28%),radial-gradient(circle_at_69%_67%,rgba(201,70,59,0.42)_0%,transparent_29%),radial-gradient(circle_at_36%_68%,rgba(99,178,82,0.36)_0%,transparent_24%)] mix-blend-screen" />
                    ) : null}

                    {layerVisibility.heatmap
                      ? zoneRows.map((zone) => {
                          const color = zoneColor(zone.health);
                          return (
                            <div
                              key={`heat-${zone.zone}`}
                              className="absolute rounded-full pointer-events-none"
                              style={{
                                left: `${zone.centroid.x}%`,
                                top: `${zone.centroid.y}%`,
                                width: `${20 + zone.area * 0.7}%`,
                                height: `${20 + zone.area * 0.7}%`,
                                transform: "translate(-50%, -50%)",
                                background: `radial-gradient(circle, ${color}88 0%, ${color}20 46%, transparent 72%)`,
                                filter: "blur(3px)",
                              }}
                            />
                          );
                        })
                      : null}

                    {layerVisibility.boundary ? (
                      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon
                          points={boundaryPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                          fill="rgba(169, 114, 65, 0.18)"
                          stroke="#f9d8b4"
                          strokeWidth="0.55"
                          strokeDasharray="1.4 0.8"
                        />
                        {boundaryPoints.map((point, index) => (
                          <circle
                            key={`boundary-node-${index}`}
                            cx={point.x}
                            cy={point.y}
                            r="0.9"
                            fill="#f9e2c8"
                            stroke="#885227"
                            strokeWidth="0.24"
                          />
                        ))}
                      </svg>
                    ) : null}

                    {drawMode && draftPoints.length > 0 ? (
                      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polyline
                          points={draftPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                          fill="none"
                          stroke="#4ea244"
                          strokeWidth="0.45"
                          strokeDasharray="1.2 0.7"
                        />
                        {draftPoints.map((point, index) => (
                          <circle key={`draft-${index}`} cx={point.x} cy={point.y} r="0.82" fill="#d2f3c8" stroke="#2f7a3e" strokeWidth="0.2" />
                        ))}
                      </svg>
                    ) : null}
                  </motion.div>
                )}

                <div className="absolute top-3 left-3 rounded-xl border border-white/25 bg-black/25 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                  Zoom {mapZoom.toFixed(1)}x
                </div>
                <div className="absolute top-3 right-3 rounded-xl border border-white/25 bg-black/25 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm inline-flex items-center gap-1.5">
                  <Move3D size={12} />
                  {drawMode ? "Drawing Mode" : "Pan Mode"}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#d6e7db] bg-[#f9fcf9] p-4">
                <h3 className="text-sm font-black text-[#1e4531] inline-flex items-center gap-2">
                  <MapPinned size={15} />
                  Farm Boundary Drawing Tool
                </h3>
                <p className="mt-1 text-xs text-[#567564]">
                  Draw polygon points directly on map, upload GPS coordinates, or import GeoJSON.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawMode((previous) => !previous);
                      setToolMessage((previous) =>
                        drawMode
                          ? previous || "Draw mode disabled."
                          : "Draw mode enabled. Click map to place points."
                      );
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      drawMode
                        ? "border-[#2f7a3e] bg-[#e8f6ec] text-[#245f37]"
                        : "border-[#d5e5d8] bg-white text-[#496a59]"
                    }`}
                  >
                    {drawMode ? "Disable Draw" : "Draw Polygon"}
                  </button>
                  <button
                    type="button"
                    onClick={commitBoundary}
                    className="rounded-xl border border-[#d5e5d8] bg-white px-3 py-2 text-xs font-semibold text-[#496a59] hover:bg-[#f2f7f3]"
                  >
                    Complete Polygon
                  </button>
                  <button
                    type="button"
                    onClick={clearBoundary}
                    className="rounded-xl border border-[#ead7d4] bg-[#fff7f5] px-3 py-2 text-xs font-semibold text-[#8a4e3a] hover:bg-[#fff0eb]"
                  >
                    Reset Boundary
                  </button>
                </div>

                <div className="mt-3 rounded-xl border border-[#dbe9de] bg-white px-3 py-2 text-xs text-[#567264]">
                  {toolMessage || "Boundary area updates automatically after each imported or completed polygon."}
                </div>
              </div>

              <div className="rounded-2xl border border-[#d6e7db] bg-[#f9fcf9] p-4">
                <h3 className="text-sm font-black text-[#1e4531] inline-flex items-center gap-2">
                  <UploadCloud size={15} />
                  GPS / GeoJSON Import
                </h3>

                <div className="mt-3 grid gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#3f6451]">GPS coordinates (lat,lon per line)</label>
                    <textarea
                      value={gpsInput}
                      onChange={(event) => setGpsInput(event.target.value)}
                      rows={3}
                      placeholder="19.076,72.877\n19.078,72.884\n19.071,72.889"
                      className="mt-1 w-full rounded-xl border border-[#d5e6d8] bg-white px-3 py-2 text-xs text-[#244e38] outline-none focus:border-[#8ec39a]"
                    />
                    <button
                      type="button"
                      onClick={importGpsBoundary}
                      className="mt-2 rounded-lg bg-[#2f7a3e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#276633]"
                    >
                      Import GPS Boundary
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#3f6451]">GeoJSON polygon</label>
                    <textarea
                      value={geoJsonInput}
                      onChange={(event) => setGeoJsonInput(event.target.value)}
                      rows={3}
                      placeholder='{"type":"Polygon","coordinates":[[[72.87,19.07],[72.89,19.08],[72.90,19.06],[72.87,19.07]]]}'
                      className="mt-1 w-full rounded-xl border border-[#d5e6d8] bg-white px-3 py-2 text-xs text-[#244e38] outline-none focus:border-[#8ec39a]"
                    />
                    <button
                      type="button"
                      onClick={importGeoJsonBoundary}
                      className="mt-2 rounded-lg border border-[#d2e4d6] bg-white px-3 py-1.5 text-xs font-semibold text-[#285d3c] hover:bg-[#f1f8f3]"
                    >
                      Import GeoJSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 }}
              className="rounded-3xl border border-[#d7e6dc] bg-white/72 backdrop-blur-xl shadow-[0_20px_48px_-34px_rgba(20,72,44,0.56)] p-5"
            >
              <SectionHeader
                icon={Gauge}
                title="NDVI Vegetation Index"
                subtitle="NDVI = (NIR - Red) / (NIR + Red)"
              />

              <div className="mt-4 grid gap-4">
                <div className="mx-auto relative h-44 w-44 rounded-full p-3" style={{ background: `conic-gradient(#2f9e44 ${ndviPercent}%, #dfe8e2 ${ndviPercent}% 100%)` }}>
                  <div className="grid h-full w-full place-items-center rounded-full bg-white text-center shadow-inner">
                    <p className="text-xs font-semibold text-[#587564]">NDVI Average</p>
                    <p className="text-3xl font-black text-[#1f4d34]">{ndviAverage.toFixed(2)}</p>
                    <p className="text-xs font-semibold text-[#3d7052]">{ndviStatus}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#dbe9de] bg-[#f8fbf8] p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#4d6f5b]">NDVI Legend</p>
                  <div className="mt-2 space-y-1.5">
                    {NDVI_BANDS.map((band) => (
                      <div key={band.range} className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-2 text-[#2f5340]">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: band.color }} />
                          {band.range}
                        </span>
                        <span className="font-semibold text-[#395e49]">{band.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="rounded-3xl border border-[#d7e6dc] bg-white/72 backdrop-blur-xl shadow-[0_20px_48px_-34px_rgba(20,72,44,0.56)] p-5"
            >
              <SectionHeader
                icon={SunMedium}
                title="Weather Impact Analysis"
                subtitle="Satellite + weather stress correlation"
              />

              <div className="mt-3 grid gap-2 text-sm">
                <div className="rounded-xl border border-[#dce8df] bg-[#f9fcf9] px-3 py-2 inline-flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[#436955]">
                    <ThermometerSun size={14} /> Temperature
                  </span>
                  <span className="font-bold text-[#19442e]">{dashboard.weatherImpact.temperature}C</span>
                </div>
                <div className="rounded-xl border border-[#dce8df] bg-[#f9fcf9] px-3 py-2 inline-flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[#436955]">
                    <Droplets size={14} /> Humidity
                  </span>
                  <span className="font-bold text-[#19442e]">{dashboard.weatherImpact.humidity}%</span>
                </div>
                <div className="rounded-xl border border-[#dce8df] bg-[#f9fcf9] px-3 py-2 inline-flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[#436955]">
                    <CloudRain size={14} /> Rainfall
                  </span>
                  <span className="font-bold text-[#19442e]">{dashboard.weatherImpact.rainfall} mm</span>
                </div>
              </div>

              <p className="mt-3 rounded-xl border border-[#d6e7db] bg-[#f1f8f3] px-3 py-2 text-xs text-[#315b44]">
                AI Insight: {dashboard.weatherImpact.insight}
              </p>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.14 }}
              className="rounded-3xl border border-[#d7e6dc] bg-white/72 backdrop-blur-xl shadow-[0_20px_48px_-34px_rgba(20,72,44,0.56)] p-5"
            >
              <SectionHeader
                icon={ShieldCheck}
                title="Field Zone Breakdown"
                subtitle="Healthy vs moderate vs stressed area share"
              />

              <div className="mt-3 space-y-2.5">
                {zoneRows.map((zone) => {
                  const share = zoneShareTotal > 0 ? (zone.area / zoneShareTotal) * 100 : 0;
                  const color = zoneColor(zone.health);

                  return (
                    <button
                      key={zone.zone}
                      type="button"
                      onClick={() => setSelectedZone(zone.zone)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        selectedZone === zone.zone
                          ? "border-[#bddac5] bg-[#eef7f0]"
                          : "border-[#d9e7dc] bg-[#f9fcf9]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#244f38]">Zone {zone.zone} - {zone.health}</span>
                        <span className="font-semibold text-[#4f715f]">{share.toFixed(1)}%</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#deebe0]">
                        <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: color }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.section>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
            className="rounded-3xl border border-[#d7e6dc] bg-white/72 backdrop-blur-xl shadow-[0_20px_48px_-34px_rgba(20,72,44,0.56)] p-5 sm:p-6"
          >
            <SectionHeader
              icon={Activity}
              title="NDVI Trend Analysis"
              subtitle="Vegetation trend for the last 30 days"
            />

            <div className="mt-4 h-70 w-full">
              <ResponsiveContainer>
                <AreaChart data={dashboard.ndvi.trend} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ndviFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b9f4a" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#3b9f4a" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#deebe0" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#597565" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "#597565" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(2), "NDVI"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #d5e7da", background: "#fafffb" }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#2f7a3e" strokeWidth={2} fill="url(#ndviFill)" />
                  <Line type="monotone" dataKey="value" stroke="#285f37" dot={false} strokeWidth={1.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
              <div className="rounded-xl border border-[#dbe9de] bg-[#f8fbf8] px-3 py-2">
                <p className="text-[#587565]">Data Source</p>
                <p className="font-semibold text-[#274d38]">{dashboard.ndvi.source}</p>
              </div>
              <div className="rounded-xl border border-[#dbe9de] bg-[#f8fbf8] px-3 py-2">
                <p className="text-[#587565]">Map Layers</p>
                <p className="font-semibold text-[#274d38]">Satellite + NDVI + Stress Heatmap</p>
              </div>
              <div className="rounded-xl border border-[#dbe9de] bg-[#f8fbf8] px-3 py-2">
                <p className="text-[#587565]">Security</p>
                <p className="font-semibold text-[#274d38]">JWT-authenticated farmer access</p>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="rounded-3xl border border-[#d7e6dc] bg-white/72 backdrop-blur-xl shadow-[0_20px_48px_-34px_rgba(20,72,44,0.56)] p-5"
          >
            <SectionHeader
              icon={Bot}
              title="AI Crop Health Analysis"
              subtitle="Zone-level vegetation intelligence"
            />

            <div className="mt-4 space-y-2.5">
              {dashboard.analysis.aiInsights.map((insight, index) => (
                <motion.div
                  key={`${insight}-${index}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-xl border border-[#d8e8dd] bg-[#f8fbf8] px-3 py-2.5 text-sm text-[#315b44]"
                >
                  <p className="inline-flex items-start gap-2">
                    <WandSparkles size={14} className="mt-0.5 text-[#2f7a3e]" />
                    <span>{insight}</span>
                  </p>
                </motion.div>
              ))}
            </div>

            {selectedZoneData ? (
              <div className="mt-4 rounded-xl border border-[#d4e5d9] bg-white px-3 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#527261]">Selected Zone</p>
                <p className="mt-1 text-sm font-black text-[#224c37]">
                  Zone {selectedZoneData.zone} - {selectedZoneData.label}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full bg-[#edf7f0] px-2 py-1 font-semibold text-[#2b6940]">
                    NDVI {selectedZoneData.ndvi.toFixed(2)}
                  </span>
                  <span className={`rounded-full border px-2 py-1 font-semibold ${stressBadgeClass(selectedZoneData.stressType)}`}>
                    {selectedZoneData.stressType}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#496957]">Recommendation: {selectedZoneData.recommendation}</p>
              </div>
            ) : null}
          </motion.section>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.22 }}
            className="rounded-3xl border border-[#d7e6dc] bg-white/72 backdrop-blur-xl shadow-[0_20px_48px_-34px_rgba(20,72,44,0.56)] p-5"
          >
            <SectionHeader
              icon={FlaskConical}
              title="Field Stress Detection"
              subtitle="Cause-oriented stress diagnostics"
            />

            <div className="mt-4 space-y-2.5">
              {stressRows.length > 0 ? (
                stressRows.map((row) => (
                  <div key={`stress-${row.zone}`} className="rounded-xl border border-[#d9e7dc] bg-[#f8fbf8] px-3 py-2.5">
                    <p className="text-sm font-black text-[#214b36]">{row.stressType}</p>
                    <p className="text-xs text-[#557466] mt-0.5">Zone {row.zone} - Affected Area: {row.area}%</p>
                    <p className="text-xs text-[#436652] mt-1">Signal: {row.health} vegetation pattern</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-[#d9e7dc] bg-[#f8fbf8] px-3 py-3 text-sm text-[#3f614f]">
                  No critical stress pockets detected at this time.
                </div>
              )}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.26 }}
            className="rounded-3xl border border-[#d7e6dc] bg-white/72 backdrop-blur-xl shadow-[0_20px_48px_-34px_rgba(20,72,44,0.56)] p-5"
          >
            <SectionHeader
              icon={Layers3}
              title="Satellite Image Comparison"
              subtitle="Today vs last week vs last month"
            />

            <div className="mt-4 space-y-3">
              {comparisonData.map((item) => (
                <div key={item.label} className="rounded-xl border border-[#d9e7dc] bg-[#f8fbf8] p-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#3f614f]">
                    <span>{item.label}</span>
                    <span className={`${item.delta < 0 ? "text-rose-700" : item.delta > 0 ? "text-emerald-700" : "text-slate-700"}`}>
                      {item.delta === 0 ? "baseline" : `${item.delta > 0 ? "+" : ""}${item.delta.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="mt-2 relative h-16 overflow-hidden rounded-lg border border-[#d4e5d8] bg-[linear-gradient(140deg,#3f5f41,#2d4531,#233628)]">
                    <div
                      className="absolute inset-0 mix-blend-screen"
                      style={{
                        background: `radial-gradient(circle at 35% 40%, ${
                          item.value >= 0.6 ? "rgba(74,170,76,0.55)" : item.value >= 0.4 ? "rgba(210,168,52,0.55)" : "rgba(201,70,59,0.55)"
                        } 0%, transparent 62%)`,
                      }}
                    />
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <polygon
                        points={boundaryPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                        fill="rgba(255,255,255,0.08)"
                        stroke="rgba(255,248,239,0.75)"
                        strokeWidth="0.55"
                      />
                    </svg>
                  </div>
                  <p className="mt-1.5 text-xs text-[#3a5f4b]">NDVI {item.value.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="rounded-3xl border border-[#d7e6dc] bg-white/72 backdrop-blur-xl shadow-[0_20px_48px_-34px_rgba(20,72,44,0.56)] p-5"
          >
            <SectionHeader
              icon={AlertTriangle}
              title="Alert System"
              subtitle="Vegetation and stress anomaly alerts"
            />

            <div className="mt-4 space-y-2.5">
              {dashboard.analysis.alerts.map((alert, index) => {
                const style = severityClass(alert.severity);
                const Icon = style.icon;

                return (
                  <div key={`${alert.title}-${index}`} className={`rounded-xl border px-3 py-2.5 ${style.container}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="inline-flex items-center gap-2 text-sm font-black text-[#2c4737]">
                        {React.createElement(Icon, { size: 14 })}
                        {alert.title}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#446452]">{alert.message}</p>
                  </div>
                );
              })}
            </div>
          </motion.section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.34 }}
            className="rounded-3xl border border-[#d7e6dc] bg-white/72 backdrop-blur-xl shadow-[0_20px_48px_-34px_rgba(20,72,44,0.56)] p-5 sm:p-6"
          >
            <SectionHeader
              icon={Leaf}
              title="AI Recommendation Panel"
              subtitle="Actionable irrigation and nutrient decisions"
            />

            <div className="mt-4 grid gap-2.5">
              {dashboard.analysis.recommendations.map((recommendation, index) => (
                <div key={`${recommendation}-${index}`} className="rounded-xl border border-[#d9e7dc] bg-[#f8fbf8] px-3 py-2.5 text-sm text-[#325c45]">
                  <p className="inline-flex items-start gap-2">
                    <Bot size={14} className="mt-0.5 text-[#2f7a3e]" />
                    <span>{recommendation}</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-[#d4e5d9] bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#547261]">Satellite + AI Stack</p>
              <p className="mt-1 text-xs text-[#3f614f]">{dashboard.sources.satellite}</p>
              <p className="mt-1 text-xs text-[#3f614f]">{dashboard.sources.engine}</p>
              <p className="mt-1 text-xs text-[#3f614f]">{dashboard.sources.security}</p>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.38 }}
            className="rounded-3xl border border-[#d7e6dc] bg-white/72 backdrop-blur-xl shadow-[0_20px_48px_-34px_rgba(20,72,44,0.56)] p-5"
          >
            <SectionHeader
              icon={UploadCloud}
              title="Live Data Flow"
              subtitle="Frontend hooks + backend APIs + AI model"
            />

            <div className="mt-4 space-y-2">
              {FLOW_STEPS.map((step, index) => (
                <div key={step} className="inline-flex w-full items-center gap-2 rounded-xl border border-[#d8e7dc] bg-[#f8fbf8] px-3 py-2 text-xs font-semibold text-[#365d48]">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#e8f5ec] text-[#25653a]">{index + 1}</span>
                  {step}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-[#d8e7dc] bg-white p-3 text-xs text-[#3f614f] space-y-1.5">
              <p className="font-black uppercase tracking-wide text-[#4f7060]">API Endpoints</p>
              <p>GET {ENDPOINTS.ndvi}</p>
              <p>GET {ENDPOINTS.farmBoundary}</p>
              <p>GET {ENDPOINTS.vegetation}</p>
              <p className="mt-2 font-black uppercase tracking-wide text-[#4f7060]">MongoDB Collection</p>
              <p>FarmSatelliteData {'{ farmerId, farmBoundary, ndviValues, stressZones, timestamp }'}</p>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export default SatelliteMonitoring;
