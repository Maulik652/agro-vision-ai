import json
import math
from typing import Dict, Optional, Tuple
from urllib.parse import urlencode
from urllib.request import urlopen

from .common import clamp, safe_float, sanitize_crop_type


CROP_WEATHER_TARGETS = {
    "tomato": {"temp": 27.0, "humidity": 68.0, "rainfall": 95.0},
    "rice": {"temp": 30.0, "humidity": 78.0, "rainfall": 140.0},
    "wheat": {"temp": 23.0, "humidity": 55.0, "rainfall": 78.0},
    "cotton": {"temp": 29.0, "humidity": 62.0, "rainfall": 92.0},
    "maize": {"temp": 26.0, "humidity": 60.0, "rainfall": 86.0},
    "soybean": {"temp": 25.0, "humidity": 64.0, "rainfall": 88.0},
    "groundnut": {"temp": 28.0, "humidity": 58.0, "rainfall": 82.0},
}


def _risk_label(score: float) -> str:
    safe = safe_float(score, 0.0)

    if safe >= 75:
        return "High"

    if safe >= 58:
        return "Moderate"

    if safe >= 38:
        return "Medium"

    return "Low"


def _extract_coordinates(payload: Dict) -> Optional[Tuple[float, float]]:
    user_context = payload.get("userContext") if isinstance(payload.get("userContext"), dict) else {}

    latitude = (
        payload.get("latitude")
        or payload.get("lat")
        or (user_context or {}).get("latitude")
        or (user_context or {}).get("lat")
    )

    longitude = (
        payload.get("longitude")
        or payload.get("lon")
        or payload.get("lng")
        or (user_context or {}).get("longitude")
        or (user_context or {}).get("lon")
        or (user_context or {}).get("lng")
    )

    lat = safe_float(latitude, float("nan"))
    lon = safe_float(longitude, float("nan"))

    if math.isnan(lat) or math.isnan(lon):
        return None

    if abs(lat) > 90 or abs(lon) > 180:
        return None

    return (lat, lon)


def _fetch_open_meteo(lat: float, lon: float) -> Optional[Dict]:
    try:
        params = urlencode(
            {
                "latitude": f"{lat:.6f}",
                "longitude": f"{lon:.6f}",
                "current": "temperature_2m,relative_humidity_2m,precipitation",
                "timezone": "auto",
            }
        )
        url = f"https://api.open-meteo.com/v1/forecast?{params}"

        with urlopen(url, timeout=1.8) as response:
            payload = json.loads(response.read().decode("utf-8"))

        current = payload.get("current") if isinstance(payload, dict) else {}
        if not isinstance(current, dict):
            return None

        return {
            "temperature": safe_float(current.get("temperature_2m"), float("nan")),
            "humidity": safe_float(current.get("relative_humidity_2m"), float("nan")),
            "rainfall": safe_float(current.get("precipitation"), float("nan")),
            "source": "open-meteo",
        }
    except Exception:
        return None


def _build_forecast(risk_score: float) -> Dict:
    labels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]
    values = []

    for day in range(7):
        seasonal = math.sin((day + 1) * 0.95) * 2.7
        micro = math.cos((day + 2) * 1.35) * 1.8
        drift = (day - 3) * 0.32
        values.append(round(clamp(risk_score + seasonal + micro + drift, 0.0, 100.0), 2))

    return {
        "title": "7 Day Weather Impact Chart",
        "type": "area",
        "xKey": "label",
        "yKey": "value",
        "data": [{"label": labels[index], "value": values[index]} for index in range(7)],
    }


def get_weather_context(payload: Dict, crop_key: str = "") -> Dict:
    safe_crop = sanitize_crop_type(crop_key or payload.get("cropType", "tomato"))
    target = CROP_WEATHER_TARGETS.get(safe_crop, CROP_WEATHER_TARGETS["tomato"])

    api_values = None
    coordinates = _extract_coordinates(payload)
    if coordinates is not None:
        api_values = _fetch_open_meteo(coordinates[0], coordinates[1])

    temperature = safe_float(
        (api_values or {}).get("temperature") if api_values else payload.get("temperature"),
        target["temp"],
    )
    humidity = safe_float(
        (api_values or {}).get("humidity") if api_values else payload.get("humidity"),
        target["humidity"],
    )
    rainfall = safe_float(
        (api_values or {}).get("rainfall") if api_values else payload.get("rainfall"),
        target["rainfall"],
    )

    heat_stress = clamp(abs(temperature - target["temp"]) * 5.2, 0.0, 100.0)
    excess_rainfall_risk = clamp(max(0.0, rainfall - target["rainfall"]) * 1.45, 0.0, 100.0)
    humidity_disease_risk = clamp(max(0.0, humidity - target["humidity"]) * 2.05, 0.0, 100.0)

    weather_risk = clamp(
        (heat_stress * 0.3) + (excess_rainfall_risk * 0.4) + (humidity_disease_risk * 0.3),
        0.0,
        100.0,
    )

    source = "payload"
    if api_values and api_values.get("source") == "open-meteo":
        source = "open-meteo"

    return {
        "temperature": round(temperature, 2),
        "humidity": round(humidity, 2),
        "rainfall": round(rainfall, 2),
        "heatStress": round(heat_stress, 1),
        "excessRainfallRisk": round(excess_rainfall_risk, 1),
        "humidityDiseaseRisk": round(humidity_disease_risk, 1),
        "riskScore": round(weather_risk, 1),
        "riskLabel": _risk_label(weather_risk),
        "source": source,
        "forecast": _build_forecast(weather_risk),
    }
