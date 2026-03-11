const WEATHER_CACHE_TTL_MS = Number(process.env.WEATHER_CACHE_TTL_MS || 10 * 60 * 1000);
const WEATHER_PROVIDER = String(process.env.WEATHER_PROVIDER || "openweather").trim().toLowerCase();
const OPENWEATHER_API_KEY = String(process.env.OPENWEATHER_API_KEY || "").trim();
const WEATHER_AI_API_URL = String(process.env.WEATHER_AI_API_URL || "").trim();

const weatherCache = new Map();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const dayLabel = (dateValue, short = false) =>
  new Date(dateValue).toLocaleDateString("en-US", { weekday: short ? "short" : "long" });

const textSeed = (value = "") => {
  let hash = 0;
  const text = String(value).toLowerCase();

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) % 1000003;
  }

  return hash;
};

const parseCoordinate = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeCondition = (value) => {
  const raw = String(value || "").trim();
  return raw || "Cloudy";
};

const buildCacheKey = (locationInput) => {
  if (locationInput.lat !== null && locationInput.lon !== null) {
    return `coord:${locationInput.lat.toFixed(4)},${locationInput.lon.toFixed(4)}`;
  }

  return `location:${String(locationInput.query || locationInput.name || "farm").toLowerCase()}`;
};

const resolveLocationInput = ({ query = {}, user = {} }) => {
  const lat = parseCoordinate(query.lat);
  const lon = parseCoordinate(query.lon);

  if (lat !== null && lon !== null) {
    const roundedLat = Number(lat.toFixed(4));
    const roundedLon = Number(lon.toFixed(4));

    return {
      lat: roundedLat,
      lon: roundedLon,
      query: `GPS(${roundedLat},${roundedLon})`,
      name: `GPS (${roundedLat}, ${roundedLon})`,
      city: String(user.city || "").trim(),
      state: String(user.state || "").trim(),
      key: `coord:${roundedLat},${roundedLon}`
    };
  }

  const manualLocation = String(query.location || query.q || "").trim();
  const city = String(user.city || "").trim();
  const state = String(user.state || "").trim();

  let locationQuery = manualLocation;
  if (!locationQuery) {
    locationQuery = [city, state].filter(Boolean).join(", ");
  }
  if (!locationQuery) {
    locationQuery = "Farm Zone";
  }

  return {
    lat: null,
    lon: null,
    query: locationQuery,
    name: locationQuery,
    city,
    state,
    key: `location:${locationQuery.toLowerCase()}`
  };
};

const buildFallbackForecast = (currentTemperature, humidityBase, rainBase, seed) => {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);

    const waveTemp = Math.sin((seed % 17) * 0.07 + index * 0.85) * 3;
    const waveRain = Math.cos((seed % 19) * 0.05 + index * 0.72) * 18;
    const waveHumidity = Math.sin((seed % 13) * 0.09 + index * 0.6) * 11;

    const temperature = Math.round(clamp(currentTemperature + waveTemp, 14, 45));
    const humidity = Math.round(clamp(humidityBase + waveHumidity, 25, 98));
    const rainProbability = Math.round(clamp(rainBase + waveRain, 6, 95));
    const windSpeed = Math.round(clamp(8 + (seed % 7) + Math.cos(index * 0.8) * 4, 4, 30));
    const cloudCoverage = Math.round(clamp((humidity + rainProbability) / 2, 15, 98));

    let condition = "Sunny";
    if (rainProbability >= 75) {
      condition = "Rainy";
    } else if (rainProbability >= 55) {
      condition = "Cloudy";
    } else if (windSpeed >= 24) {
      condition = "Windy";
    }

    return {
      dateISO: date.toISOString(),
      day: dayLabel(date, false),
      dayShort: dayLabel(date, true),
      temperature,
      minTemp: temperature - 3,
      maxTemp: temperature + 2,
      humidity,
      windSpeed,
      rainProbability,
      cloudCoverage,
      condition
    };
  });
};

const buildFallbackSnapshot = (locationInput) => {
  const seed = textSeed(locationInput.key);
  const temperature = Math.round(clamp(28 + ((seed % 9) - 4) * 0.9, 16, 42));
  const humidity = Math.round(clamp(56 + (seed % 23), 28, 94));
  const rainProbability = Math.round(clamp(34 + ((seed % 21) - 10), 6, 93));
  const windSpeed = Math.round(clamp(6 + (seed % 11), 4, 26));
  const cloudCoverage = Math.round(clamp((humidity + rainProbability) / 2, 10, 96));
  const uvIndex = Math.round(clamp(9 - (cloudCoverage / 17), 1, 11));
  const rainfall = Number((rainProbability * 0.12).toFixed(1));

  const forecast = buildFallbackForecast(temperature, humidity, rainProbability, seed);

  const current = {
    temperature,
    humidity,
    windSpeed,
    rainfall,
    rainProbability,
    cloudCoverage,
    uvIndex,
    condition: rainProbability >= 70 ? "Rainy" : rainProbability >= 45 ? "Cloudy" : "Partly Cloudy",
    feelsLike: temperature + (humidity >= 70 ? 2 : 0),
    updatedAt: new Date().toISOString(),
    location: locationInput.name
  };

  return {
    current,
    forecast,
    source: "fallback",
    location: {
      name: locationInput.name,
      city: locationInput.city,
      state: locationInput.state,
      lat: locationInput.lat,
      lon: locationInput.lon,
      query: locationInput.query,
      key: locationInput.key
    },
    cached: false
  };
};

const requestJson = async (url, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Weather provider request failed with ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const resolveCoordinatesForOpenWeather = async (locationInput) => {
  if (locationInput.lat !== null && locationInput.lon !== null) {
    return {
      lat: locationInput.lat,
      lon: locationInput.lon,
      city: locationInput.city,
      state: locationInput.state,
      displayName: locationInput.name
    };
  }

  const geoUrl = new URL("https://api.openweathermap.org/geo/1.0/direct");
  geoUrl.searchParams.set("q", locationInput.query);
  geoUrl.searchParams.set("limit", "1");
  geoUrl.searchParams.set("appid", OPENWEATHER_API_KEY);

  const geoRows = await requestJson(geoUrl.toString());
  const first = Array.isArray(geoRows) ? geoRows[0] : null;

  if (!first) {
    throw new Error("Location could not be geocoded by OpenWeather");
  }

  return {
    lat: Number(first.lat),
    lon: Number(first.lon),
    city: String(first.name || locationInput.city || "").trim(),
    state: String(first.state || locationInput.state || "").trim(),
    displayName: String(first.name || locationInput.query || "Farm Zone").trim()
  };
};

const aggregateOpenWeatherForecast = (forecastRows = []) => {
  const grouped = new Map();

  forecastRows.forEach((row) => {
    const unix = toNumber(row?.dt, Date.now() / 1000);
    const date = new Date(unix * 1000);
    const key = date.toISOString().slice(0, 10);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(row);
  });

  return [...grouped.entries()].slice(0, 7).map(([dateKey, rows]) => {
    const date = new Date(`${dateKey}T00:00:00.000Z`);

    const temperatures = rows.map((row) => toNumber(row?.main?.temp, 0));
    const minTemps = rows.map((row) => toNumber(row?.main?.temp_min, 0));
    const maxTemps = rows.map((row) => toNumber(row?.main?.temp_max, 0));
    const humidityValues = rows.map((row) => toNumber(row?.main?.humidity, 0));
    const windValues = rows.map((row) => toNumber(row?.wind?.speed, 0) * 3.6);
    const rainProbValues = rows.map((row) => toNumber(row?.pop, 0) * 100);
    const cloudValues = rows.map((row) => toNumber(row?.clouds?.all, 0));

    const conditionCounts = {};
    rows.forEach((row) => {
      const condition = normalizeCondition(row?.weather?.[0]?.main);
      conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
    });

    const dominantCondition =
      Object.entries(conditionCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || "Cloudy";

    const avg = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

    return {
      dateISO: date.toISOString(),
      day: dayLabel(date, false),
      dayShort: dayLabel(date, true),
      temperature: Math.round(avg(temperatures)),
      minTemp: Math.round(Math.min(...minTemps)),
      maxTemp: Math.round(Math.max(...maxTemps)),
      humidity: Math.round(clamp(avg(humidityValues), 0, 100)),
      windSpeed: Math.round(clamp(avg(windValues), 0, 140)),
      rainProbability: Math.round(clamp(Math.max(...rainProbValues), 0, 100)),
      cloudCoverage: Math.round(clamp(avg(cloudValues), 0, 100)),
      condition: dominantCondition
    };
  });
};

const ensureSevenDays = (forecast, fallbackForecast) => {
  if (forecast.length >= 7) {
    return forecast.slice(0, 7);
  }

  const merged = [...forecast];
  const usedDates = new Set(merged.map((row) => row.dateISO.slice(0, 10)));

  fallbackForecast.forEach((row) => {
    if (merged.length >= 7) {
      return;
    }

    const dateKey = row.dateISO.slice(0, 10);
    if (!usedDates.has(dateKey)) {
      usedDates.add(dateKey);
      merged.push(row);
    }
  });

  return merged.slice(0, 7);
};

const estimateUvIndex = (currentWeather) => {
  const timezoneOffset = toNumber(currentWeather?.timezone, 0);
  const cloudCoverage = clamp(toNumber(currentWeather?.clouds?.all, 45), 0, 100);

  const utcHour = new Date().getUTCHours();
  const localHour = (utcHour + Math.round(timezoneOffset / 3600) + 24) % 24;

  let baseline = 2;
  if (localHour >= 10 && localHour <= 15) {
    baseline = 10;
  } else if (localHour >= 8 && localHour <= 17) {
    baseline = 7;
  }

  return Math.round(clamp(baseline * (1 - (cloudCoverage / 170)), 1, 12));
};

const buildOpenWeatherSnapshot = ({ currentRaw, forecastRaw, resolvedLocation, locationInput }) => {
  const fallback = buildFallbackSnapshot({
    ...locationInput,
    lat: resolvedLocation.lat,
    lon: resolvedLocation.lon,
    city: resolvedLocation.city,
    state: resolvedLocation.state,
    name: resolvedLocation.displayName,
    key: buildCacheKey({ lat: resolvedLocation.lat, lon: resolvedLocation.lon, query: resolvedLocation.displayName })
  });

  const forecastRows = aggregateOpenWeatherForecast(forecastRaw?.list || []);
  const forecast = ensureSevenDays(forecastRows, fallback.forecast);

  const rawRainOneHour = toNumber(currentRaw?.rain?.["1h"], NaN);
  const rawRainThreeHour = toNumber(currentRaw?.rain?.["3h"], NaN);
  const rainfall = Number(
    (Number.isFinite(rawRainOneHour)
      ? rawRainOneHour
      : Number.isFinite(rawRainThreeHour)
      ? rawRainThreeHour / 3
      : forecast[0]?.rainProbability * 0.1 || 0).toFixed(1)
  );

  const rainProbability =
    toNumber(forecast[0]?.rainProbability, NaN) ||
    Math.round(clamp(toNumber(currentRaw?.clouds?.all, 40) * 0.6 + toNumber(currentRaw?.main?.humidity, 60) * 0.35 - 20, 0, 100));

  const currentTemperature = Math.round(toNumber(currentRaw?.main?.temp, forecast[0]?.temperature || 30));
  const humidity = Math.round(clamp(toNumber(currentRaw?.main?.humidity, forecast[0]?.humidity || 60), 0, 100));
  const windSpeed = Math.round(clamp(toNumber(currentRaw?.wind?.speed, 0) * 3.6, 0, 140));
  const cloudCoverage = Math.round(clamp(toNumber(currentRaw?.clouds?.all, forecast[0]?.cloudCoverage || 40), 0, 100));
  const condition = normalizeCondition(currentRaw?.weather?.[0]?.main || forecast[0]?.condition);

  const uvIndex = estimateUvIndex(currentRaw);

  const current = {
    temperature: currentTemperature,
    humidity,
    windSpeed,
    rainfall,
    rainProbability: Math.round(clamp(rainProbability, 0, 100)),
    cloudCoverage,
    uvIndex,
    condition,
    feelsLike: Math.round(toNumber(currentRaw?.main?.feels_like, currentTemperature)),
    updatedAt: new Date((toNumber(currentRaw?.dt, Date.now() / 1000)) * 1000).toISOString(),
    location: resolvedLocation.displayName
  };

  return {
    current,
    forecast,
    source: "openweather",
    location: {
      name: resolvedLocation.displayName,
      city: resolvedLocation.city,
      state: resolvedLocation.state,
      lat: Number(resolvedLocation.lat.toFixed(4)),
      lon: Number(resolvedLocation.lon.toFixed(4)),
      query: locationInput.query,
      key: buildCacheKey({ lat: resolvedLocation.lat, lon: resolvedLocation.lon, query: locationInput.query })
    },
    cached: false
  };
};

const fetchOpenWeatherSnapshot = async (locationInput) => {
  if (!OPENWEATHER_API_KEY) {
    throw new Error("OPENWEATHER_API_KEY is not configured");
  }

  const resolvedLocation = await resolveCoordinatesForOpenWeather(locationInput);

  const currentUrl = new URL("https://api.openweathermap.org/data/2.5/weather");
  currentUrl.searchParams.set("lat", String(resolvedLocation.lat));
  currentUrl.searchParams.set("lon", String(resolvedLocation.lon));
  currentUrl.searchParams.set("units", "metric");
  currentUrl.searchParams.set("appid", OPENWEATHER_API_KEY);

  const forecastUrl = new URL("https://api.openweathermap.org/data/2.5/forecast");
  forecastUrl.searchParams.set("lat", String(resolvedLocation.lat));
  forecastUrl.searchParams.set("lon", String(resolvedLocation.lon));
  forecastUrl.searchParams.set("units", "metric");
  forecastUrl.searchParams.set("appid", OPENWEATHER_API_KEY);

  const [currentRaw, forecastRaw] = await Promise.all([
    requestJson(currentUrl.toString()),
    requestJson(forecastUrl.toString())
  ]);

  return buildOpenWeatherSnapshot({
    currentRaw,
    forecastRaw,
    resolvedLocation,
    locationInput
  });
};

export const getWeatherSnapshot = async ({ query = {}, user = {}, forceFresh = false }) => {
  const locationInput = resolveLocationInput({ query, user });
  const cacheKey = buildCacheKey(locationInput);

  if (!forceFresh) {
    const cached = weatherCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp <= WEATHER_CACHE_TTL_MS) {
      return {
        ...cached.snapshot,
        source: "cache",
        cached: true
      };
    }
  }

  let snapshot;

  try {
    if (WEATHER_PROVIDER === "openweather" && OPENWEATHER_API_KEY) {
      snapshot = await fetchOpenWeatherSnapshot(locationInput);
    } else {
      throw new Error("Weather provider credentials are not configured");
    }
  } catch (_error) {
    snapshot = buildFallbackSnapshot(locationInput);
  }

  weatherCache.set(cacheKey, {
    timestamp: Date.now(),
    snapshot
  });

  return snapshot;
};

const buildRuleBasedAnalysis = ({ current, forecast = [], cropType = "Crop" }) => {
  const window = [current, ...forecast].slice(0, 8);

  const highestRain = Math.max(...window.map((item) => toNumber(item?.rainProbability, 0)));
  const highestTemp = Math.max(...window.map((item) => toNumber(item?.temperature, 0)));
  const highestWind = Math.max(...window.map((item) => toNumber(item?.windSpeed, 0)));
  const avgHumidity =
    window.reduce((sum, item) => sum + toNumber(item?.humidity, 0), 0) / Math.max(1, window.length);

  const recommendations = [];
  const alerts = [];

  if (highestRain >= 60) {
    recommendations.push("Rainfall is likely in the next 24 hours. Delay irrigation for one day.");
    alerts.push({
      level: "high",
      title: "Heavy rainfall expected",
      detail: `Rain probability may reach ${Math.round(highestRain)} percent in coming days.`,
      action: "Delay irrigation and clear drainage channels to prevent waterlogging."
    });
  }

  if (highestTemp >= 35) {
    recommendations.push("High temperature window detected. Increase irrigation frequency in short cycles.");
    alerts.push({
      level: "medium",
      title: "Heat stress warning",
      detail: `Temperature can rise up to ${Math.round(highestTemp)} C.`,
      action: "Irrigate at dawn and use mulch to reduce evaporation loss."
    });
  }

  if (avgHumidity >= 78) {
    recommendations.push("Humidity is high. Increase crop scouting for fungal leaf infections.");
    alerts.push({
      level: "medium",
      title: "Fungal disease risk",
      detail: `Average humidity is around ${Math.round(avgHumidity)} percent.`,
      action: "Avoid late-evening irrigation and improve canopy airflow."
    });
  }

  if (highestWind >= 24) {
    recommendations.push("Strong wind expected. Avoid pesticide spraying during peak wind hours.");
    alerts.push({
      level: "medium",
      title: "Strong wind conditions",
      detail: `Wind speed could touch ${Math.round(highestWind)} km/h.`,
      action: "Shift foliar operations to low-wind time windows."
    });
  }

  if (!recommendations.length) {
    recommendations.push("Weather outlook is mostly stable. Continue standard irrigation and monitoring plan.");
  }

  const riskScore = Math.round(
    clamp(
      highestRain * 0.35 +
        Math.max(0, highestTemp - 28) * 3.1 +
        highestWind * 0.6 +
        Math.max(0, avgHumidity - 65) * 0.85,
      8,
      95
    )
  );

  const summary =
    highestRain >= 60
      ? `${cropType} weather analysis indicates rain-driven irrigation opportunity and drainage risk.`
      : highestTemp >= 35
      ? `${cropType} weather analysis indicates heat stress risk over the next few days.`
      : "Weather pattern is relatively balanced for planned farm operations.";

  const irrigationHint =
    highestRain >= 60
      ? "Delay irrigation for 24 hours and review soil moisture after rainfall."
      : highestTemp >= 35
      ? "Schedule irrigation in early morning and evening with short-duration cycles."
      : "Keep one moderate irrigation cycle in early morning.";

  return {
    summary,
    recommendations,
    alerts,
    riskScore,
    irrigationHint,
    engine: "rule-based"
  };
};

const normalizeAnalysis = (raw, fallback) => {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const recommendations = Array.isArray(raw.recommendations)
    ? raw.recommendations.map((row) => String(row))
    : fallback.recommendations;

  const alerts = Array.isArray(raw.alerts)
    ? raw.alerts
        .map((alert) => ({
          level: ["low", "medium", "high"].includes(String(alert?.level || "").toLowerCase())
            ? String(alert.level).toLowerCase()
            : "medium",
          title: String(alert?.title || "Weather alert"),
          detail: String(alert?.detail || "Weather risk signal detected."),
          action: String(alert?.action || "Review farm operations.")
        }))
        .slice(0, 8)
    : fallback.alerts;

  return {
    summary: String(raw.summary || fallback.summary),
    recommendations,
    alerts,
    riskScore: Math.round(clamp(toNumber(raw.riskScore, fallback.riskScore), 0, 100)),
    irrigationHint: String(raw.irrigationHint || fallback.irrigationHint),
    engine: String(raw.engine || "fastapi")
  };
};

const callWeatherAIMicroservice = async (payload) => {
  if (!WEATHER_AI_API_URL) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(WEATHER_AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Weather AI microservice responded with ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

export const getWeatherAnalysis = async ({ current, forecast, cropType, location }) => {
  const fallback = buildRuleBasedAnalysis({ current, forecast, cropType });

  try {
    const aiPayload = {
      current,
      forecast,
      cropType,
      location
    };

    const aiResponse = await callWeatherAIMicroservice(aiPayload);
    return normalizeAnalysis(aiResponse, fallback);
  } catch (_error) {
    return fallback;
  }
};
