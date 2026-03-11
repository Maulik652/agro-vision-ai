import json
import os
from typing import Dict, Optional, Tuple
from urllib.parse import urlencode
from urllib.request import urlopen

from .common import clamp, safe_float


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

    if lat != lat or lon != lon:
        return None

    if abs(lat) > 90 or abs(lon) > 180:
        return None

    return (lat, lon)


def _extract_ndvi_value(payload: Dict) -> Optional[float]:
    if not isinstance(payload, dict):
        return None

    candidates = [
        payload.get("ndvi"),
        payload.get("ndviScore"),
        payload.get("value"),
        payload.get("vegetationIndex"),
        (payload.get("data") or {}).get("ndvi") if isinstance(payload.get("data"), dict) else None,
        ((payload.get("data") or {}).get("value") if isinstance(payload.get("data"), dict) else None),
    ]

    for candidate in candidates:
        if candidate is None:
            continue

        value = safe_float(candidate, float("nan"))
        if value == value:
            return value

    return None


def _fetch_ndvi_from_api(lat: float, lon: float) -> Optional[float]:
    api_url = os.getenv("SATELLITE_NDVI_API_URL", "").strip()
    api_key = os.getenv("SATELLITE_NDVI_API_KEY", "").strip()

    if not api_url:
        return None

    try:
        params = {"lat": f"{lat:.6f}", "lon": f"{lon:.6f}"}
        if api_key:
            params["api_key"] = api_key

        query = urlencode(params)
        separator = "&" if "?" in api_url else "?"
        url = f"{api_url}{separator}{query}"

        with urlopen(url, timeout=2.0) as response:
            payload = json.loads(response.read().decode("utf-8"))

        ndvi = _extract_ndvi_value(payload)
        if ndvi is None:
            return None

        return clamp(ndvi, 0.0, 1.0)
    except Exception:
        return None


def get_satellite_insight(
    payload: Dict,
    health_score: float,
    features: Optional[Dict] = None,
    weather_context: Optional[Dict] = None,
) -> Dict:
    feature_values = features or {}
    weather_values = weather_context or {}

    green_ratio = safe_float(feature_values.get("greenLeafRatio"), 0.56)
    lesion_ratio = safe_float(feature_values.get("lesionAreaRatio"), 0.08)
    weather_risk = safe_float(weather_values.get("riskScore"), 35.0)
    rainfall = safe_float(weather_values.get("rainfall"), safe_float(payload.get("rainfall"), 80.0))

    estimated_ndvi = clamp(
        0.31
        + (green_ratio * 0.5)
        + (safe_float(health_score, 70.0) / 270.0)
        - (lesion_ratio * 0.32)
        - (weather_risk / 520.0),
        0.18,
        0.92,
    )

    source = "estimated"
    coordinates = _extract_coordinates(payload)
    if coordinates is not None:
        api_ndvi = _fetch_ndvi_from_api(coordinates[0], coordinates[1])
        if api_ndvi is not None:
            estimated_ndvi = clamp((api_ndvi * 0.76) + (estimated_ndvi * 0.24), 0.18, 0.95)
            source = "satellite-api"

    if estimated_ndvi >= 0.75:
        vegetation_strength = "Healthy"
    elif estimated_ndvi >= 0.61:
        vegetation_strength = "Moderate"
    else:
        vegetation_strength = "Stressed"

    if rainfall >= 115:
        moisture_trend = "Increasing"
    elif rainfall >= 62:
        moisture_trend = "Stable"
    else:
        moisture_trend = "Declining"

    return {
        "title": "Satellite Crop Health Index",
        "ndviScore": round(estimated_ndvi, 2),
        "vegetationStrength": vegetation_strength,
        "soilMoistureTrend": moisture_trend,
        "source": source,
    }
