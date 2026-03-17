import math
from datetime import date, datetime
from typing import Dict, List

CROP_PROFILES: Dict[str, Dict[str, float]] = {
    "Tomato": {
        "opt_temp": 27.0, "opt_rainfall": 95.0, "opt_humidity": 68.0, "opt_soil_moisture": 58.0,
        "yield_baseline_tpha": 4.2, "yield_min_tpha": 2.5, "yield_max_tpha": 8.5,
        "heat_tolerance": 0.62, "rain_tolerance": 0.58, "pest_sensitivity": 0.95,
        "market_base_price": 2250.0,
        "cost_seed_per_hectare": 12000.0, "cost_fertilizer_per_hectare": 20500.0,
        "cost_labor_per_hectare": 24750.0, "cost_irrigation_per_hectare": 11750.0,
        "production_cost_per_hectare": 69000.0, "irrigation_mm": 30.0
    },
    "Rice": {
        "opt_temp": 30.0, "opt_rainfall": 140.0, "opt_humidity": 78.0, "opt_soil_moisture": 74.0,
        "yield_baseline_tpha": 5.1, "yield_min_tpha": 3.5, "yield_max_tpha": 7.8,
        "heat_tolerance": 0.78, "rain_tolerance": 0.85, "pest_sensitivity": 1.0,
        "market_base_price": 2400.0,
        "cost_seed_per_hectare": 9000.0, "cost_fertilizer_per_hectare": 18000.0,
        "cost_labor_per_hectare": 23000.0, "cost_irrigation_per_hectare": 11000.0,
        "production_cost_per_hectare": 61000.0, "irrigation_mm": 36.0
    },
    "Wheat": {
        "opt_temp": 23.0, "opt_rainfall": 78.0, "opt_humidity": 55.0, "opt_soil_moisture": 48.0,
        "yield_baseline_tpha": 3.6, "yield_min_tpha": 2.4, "yield_max_tpha": 6.2,
        "heat_tolerance": 0.55, "rain_tolerance": 0.52, "pest_sensitivity": 0.88,
        "market_base_price": 2550.0,
        "cost_seed_per_hectare": 6800.0, "cost_fertilizer_per_hectare": 14200.0,
        "cost_labor_per_hectare": 17400.0, "cost_irrigation_per_hectare": 8600.0,
        "production_cost_per_hectare": 47000.0, "irrigation_mm": 26.0
    },
    "Cotton": {
        "opt_temp": 29.0, "opt_rainfall": 92.0, "opt_humidity": 62.0, "opt_soil_moisture": 52.0,
        "yield_baseline_tpha": 2.8, "yield_min_tpha": 1.7, "yield_max_tpha": 4.2,
        "heat_tolerance": 0.84, "rain_tolerance": 0.60, "pest_sensitivity": 1.15,
        "market_base_price": 6800.0,
        "cost_seed_per_hectare": 9800.0, "cost_fertilizer_per_hectare": 16500.0,
        "cost_labor_per_hectare": 20400.0, "cost_irrigation_per_hectare": 9300.0,
        "production_cost_per_hectare": 56000.0, "irrigation_mm": 28.0
    },
    "Maize": {
        "opt_temp": 26.0, "opt_rainfall": 86.0, "opt_humidity": 60.0, "opt_soil_moisture": 51.0,
        "yield_baseline_tpha": 4.0, "yield_min_tpha": 2.8, "yield_max_tpha": 7.2,
        "heat_tolerance": 0.72, "rain_tolerance": 0.64, "pest_sensitivity": 1.05,
        "market_base_price": 2050.0,
        "cost_seed_per_hectare": 6200.0, "cost_fertilizer_per_hectare": 12800.0,
        "cost_labor_per_hectare": 15700.0, "cost_irrigation_per_hectare": 8300.0,
        "production_cost_per_hectare": 43000.0, "irrigation_mm": 24.0
    },
    "Soybean": {
        "opt_temp": 25.0, "opt_rainfall": 88.0, "opt_humidity": 64.0, "opt_soil_moisture": 54.0,
        "yield_baseline_tpha": 3.1, "yield_min_tpha": 1.8, "yield_max_tpha": 4.5,
        "heat_tolerance": 0.64, "rain_tolerance": 0.66, "pest_sensitivity": 0.92,
        "market_base_price": 4500.0,
        "cost_seed_per_hectare": 5600.0, "cost_fertilizer_per_hectare": 11800.0,
        "cost_labor_per_hectare": 14200.0, "cost_irrigation_per_hectare": 7400.0,
        "production_cost_per_hectare": 39000.0, "irrigation_mm": 21.0
    },
    "Groundnut": {
        "opt_temp": 28.0, "opt_rainfall": 82.0, "opt_humidity": 58.0, "opt_soil_moisture": 49.0,
        "yield_baseline_tpha": 2.6, "yield_min_tpha": 1.6, "yield_max_tpha": 4.0,
        "heat_tolerance": 0.68, "rain_tolerance": 0.55, "pest_sensitivity": 0.90,
        "market_base_price": 5400.0,
        "cost_seed_per_hectare": 6100.0, "cost_fertilizer_per_hectare": 12100.0,
        "cost_labor_per_hectare": 14900.0, "cost_irrigation_per_hectare": 7900.0,
        "production_cost_per_hectare": 41000.0, "irrigation_mm": 22.0
    },
    # ── 7 new crops ──────────────────────────────────────────────────────────
    "Potato": {
        # Cool-season tuber; sensitive to heat and waterlogging
        "opt_temp": 20.0, "opt_rainfall": 90.0, "opt_humidity": 70.0, "opt_soil_moisture": 62.0,
        "yield_baseline_tpha": 18.0, "yield_min_tpha": 12.0, "yield_max_tpha": 28.0,
        "heat_tolerance": 0.42, "rain_tolerance": 0.55, "pest_sensitivity": 1.10,
        "market_base_price": 1400.0,
        "cost_seed_per_hectare": 28000.0, "cost_fertilizer_per_hectare": 22000.0,
        "cost_labor_per_hectare": 26000.0, "cost_irrigation_per_hectare": 14000.0,
        "production_cost_per_hectare": 90000.0, "irrigation_mm": 32.0
    },
    "Sugarcane": {
        # Long-duration tropical grass; high water demand
        "opt_temp": 32.0, "opt_rainfall": 160.0, "opt_humidity": 72.0, "opt_soil_moisture": 68.0,
        "yield_baseline_tpha": 65.0, "yield_min_tpha": 45.0, "yield_max_tpha": 90.0,
        "heat_tolerance": 0.88, "rain_tolerance": 0.82, "pest_sensitivity": 1.08,
        "market_base_price": 340.0,   # Rs per quintal (FRP-linked)
        "cost_seed_per_hectare": 18000.0, "cost_fertilizer_per_hectare": 28000.0,
        "cost_labor_per_hectare": 35000.0, "cost_irrigation_per_hectare": 22000.0,
        "production_cost_per_hectare": 103000.0, "irrigation_mm": 48.0
    },
    "Mango": {
        # Tropical tree crop; drought-tolerant once established
        "opt_temp": 30.0, "opt_rainfall": 100.0, "opt_humidity": 60.0, "opt_soil_moisture": 50.0,
        "yield_baseline_tpha": 8.0, "yield_min_tpha": 4.0, "yield_max_tpha": 14.0,
        "heat_tolerance": 0.82, "rain_tolerance": 0.60, "pest_sensitivity": 0.95,
        "market_base_price": 3800.0,
        "cost_seed_per_hectare": 15000.0, "cost_fertilizer_per_hectare": 18000.0,
        "cost_labor_per_hectare": 22000.0, "cost_irrigation_per_hectare": 12000.0,
        "production_cost_per_hectare": 67000.0, "irrigation_mm": 28.0
    },
    "Banana": {
        # Tropical monocot; high water and potassium demand
        "opt_temp": 28.0, "opt_rainfall": 150.0, "opt_humidity": 78.0, "opt_soil_moisture": 70.0,
        "yield_baseline_tpha": 30.0, "yield_min_tpha": 18.0, "yield_max_tpha": 45.0,
        "heat_tolerance": 0.70, "rain_tolerance": 0.80, "pest_sensitivity": 1.05,
        "market_base_price": 1600.0,
        "cost_seed_per_hectare": 20000.0, "cost_fertilizer_per_hectare": 30000.0,
        "cost_labor_per_hectare": 32000.0, "cost_irrigation_per_hectare": 18000.0,
        "production_cost_per_hectare": 100000.0, "irrigation_mm": 42.0
    },
    "Grapes": {
        # Temperate vine; sensitive to humidity (disease) and frost
        "opt_temp": 24.0, "opt_rainfall": 70.0, "opt_humidity": 55.0, "opt_soil_moisture": 45.0,
        "yield_baseline_tpha": 12.0, "yield_min_tpha": 7.0, "yield_max_tpha": 20.0,
        "heat_tolerance": 0.60, "rain_tolerance": 0.48, "pest_sensitivity": 1.12,
        "market_base_price": 5500.0,
        "cost_seed_per_hectare": 25000.0, "cost_fertilizer_per_hectare": 24000.0,
        "cost_labor_per_hectare": 38000.0, "cost_irrigation_per_hectare": 16000.0,
        "production_cost_per_hectare": 103000.0, "irrigation_mm": 22.0
    },
    "Onion": {
        # Short-duration bulb crop; sensitive to excess moisture
        "opt_temp": 22.0, "opt_rainfall": 65.0, "opt_humidity": 52.0, "opt_soil_moisture": 44.0,
        "yield_baseline_tpha": 20.0, "yield_min_tpha": 12.0, "yield_max_tpha": 30.0,
        "heat_tolerance": 0.50, "rain_tolerance": 0.45, "pest_sensitivity": 1.02,
        "market_base_price": 1800.0,
        "cost_seed_per_hectare": 8000.0, "cost_fertilizer_per_hectare": 16000.0,
        "cost_labor_per_hectare": 22000.0, "cost_irrigation_per_hectare": 10000.0,
        "production_cost_per_hectare": 56000.0, "irrigation_mm": 20.0
    },
    "Sunflower": {
        # Drought-tolerant oilseed; moderate water demand
        "opt_temp": 25.0, "opt_rainfall": 75.0, "opt_humidity": 55.0, "opt_soil_moisture": 46.0,
        "yield_baseline_tpha": 1.8, "yield_min_tpha": 1.0, "yield_max_tpha": 3.0,
        "heat_tolerance": 0.76, "rain_tolerance": 0.58, "pest_sensitivity": 0.96,
        "market_base_price": 5800.0,
        "cost_seed_per_hectare": 5500.0, "cost_fertilizer_per_hectare": 12000.0,
        "cost_labor_per_hectare": 14000.0, "cost_irrigation_per_hectare": 7500.0,
        "production_cost_per_hectare": 39000.0, "irrigation_mm": 20.0
    },
}

SOIL_FACTORS = {
    "loamy": 1.0,
    "clay": 0.94,
    "sandy": 0.88,
    "silty": 0.97,
    "black": 1.02,
    "red": 0.93,
    "laterite": 0.9
}

IRRIGATION_FACTORS = {
    "drip": 1.04,
    "sprinkler": 0.99,
    "flood": 0.9,
    "rainfed": 0.84,
    "furrow": 0.95
}

PEST_BY_CROP = {
    "tomato":    "Fruit Borer",
    "rice":      "Brown Planthopper",
    "wheat":     "Armyworm",
    "cotton":    "Bollworm",
    "maize":     "Fall Armyworm",
    "soybean":   "Stem Fly",
    "groundnut": "Leaf Miner",
    "potato":    "Potato Tuber Moth",
    "sugarcane": "Top Borer",
    "mango":     "Mango Hopper",
    "banana":    "Banana Weevil",
    "grapes":    "Thrips",
    "onion":     "Thrips",
    "sunflower": "Capitulum Borer",
}


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def safe_float(value, default: float = 0.0, minimum: float = None, maximum: float = None) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = float(default)

    if math.isnan(parsed) or math.isinf(parsed):
        parsed = float(default)

    if minimum is not None:
        parsed = max(parsed, float(minimum))

    if maximum is not None:
        parsed = min(parsed, float(maximum))

    return parsed


def normalize(value: float, target: float, tolerance: float = 1.0) -> float:
    tolerance = max(safe_float(tolerance, 1.0), 0.5)
    deviation = abs(safe_float(value, target) - safe_float(target, 0.0)) / tolerance
    raw_score = 100.0 * math.exp(-0.58 * deviation)
    adjusted_score = (raw_score * 0.92) + 8.0

    return clamp(adjusted_score, 18.0, 100.0)


def calculate_heat_stress(temp: float, optimal_temp: float) -> float:
    deviation = abs(safe_float(temp, optimal_temp) - safe_float(optimal_temp, 26.0))
    return clamp((deviation / 13.0) * 100.0, 0.0, 100.0)


def calculate_rainfall_stress(rainfall: float, optimal_rainfall: float) -> float:
    optimal = max(safe_float(optimal_rainfall, 80.0), 1.0)
    deviation_ratio = abs(safe_float(rainfall, optimal) - optimal) / optimal
    return clamp(deviation_ratio * 130.0, 0.0, 100.0)


def calculate_humidity_stress(humidity: float, optimal_humidity: float) -> float:
    deviation = abs(safe_float(humidity, optimal_humidity, 0.0, 100.0) - safe_float(optimal_humidity, 65.0))
    return clamp((deviation / 35.0) * 100.0, 0.0, 100.0)


def calculate_soil_moisture_stress(soil_moisture: float, optimal_soil_moisture: float) -> float:
    optimal = max(safe_float(optimal_soil_moisture, 50.0), 1.0)
    deviation_ratio = abs(safe_float(soil_moisture, optimal, 0.0, 100.0) - optimal) / optimal
    return clamp(deviation_ratio * 120.0, 0.0, 100.0)


def parse_date(value: str) -> date:
    if not value:
        return date.today()

    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except ValueError:
        return date.today()


def days_between(start: str, end: str) -> int:
    start_date = parse_date(start)
    end_date = parse_date(end)

    delta = (end_date - start_date).days
    return max(delta, 1)


def crop_profile(crop_type: str) -> Dict[str, float]:
    normalized = (crop_type or "").strip().title()

    if normalized in CROP_PROFILES:
        return CROP_PROFILES[normalized]

    # Alias mapping for alternate spellings
    _aliases = {
        "Sugarcane": "Sugarcane", "Sugar Cane": "Sugarcane",
        "Groundnut": "Groundnut", "Peanut": "Groundnut",
        "Maize": "Maize", "Corn": "Maize",
        "Grapes": "Grapes", "Grape": "Grapes",
        "Banana": "Banana", "Mango": "Mango",
        "Onion": "Onion", "Sunflower": "Sunflower",
        "Potato": "Potato", "Tomato": "Tomato",
        "Wheat": "Wheat", "Rice": "Rice",
        "Cotton": "Cotton", "Soybean": "Soybean",
        "Soya": "Soybean", "Soya Bean": "Soybean",
    }

    mapped = _aliases.get(normalized)
    if mapped and mapped in CROP_PROFILES:
        return CROP_PROFILES[mapped]

    return CROP_PROFILES["Tomato"]


def soil_factor(soil_type: str) -> float:
    key = (soil_type or "loamy").strip().lower()
    return SOIL_FACTORS.get(key, 0.95)


def irrigation_factor(method: str) -> float:
    key = (method or "flood").strip().lower()
    return IRRIGATION_FACTORS.get(key, 0.92)


def hectares_from_acres(acres: float) -> float:
    return max(acres, 0.1) / 2.471


def month_seasonality(month_number: int) -> float:
    # Mild seasonal adjustment to avoid overpowering core environment scores.
    month = int(clamp(safe_float(month_number, date.today().month), 1.0, 12.0))
    primary_wave = math.sin((month - 1) * (math.pi / 6.0))
    secondary_wave = math.cos((month + 2) * (math.pi / 6.0)) * 0.4
    return 1.0 + ((primary_wave + secondary_wave) * 0.05)


def environment_scores(payload: Dict) -> Dict[str, float]:
    profile = crop_profile(payload.get("cropType", ""))

    temperature = safe_float(payload.get("temperature"), profile["opt_temp"], -10.0, 55.0)
    rainfall = safe_float(payload.get("rainfall"), profile["opt_rainfall"], 0.0, 500.0)
    humidity = safe_float(payload.get("humidity"), profile["opt_humidity"], 5.0, 100.0)
    soil_moisture = safe_float(payload.get("soilMoisture"), profile["opt_soil_moisture"], 5.0, 100.0)

    temp_tolerance = 2.8 + (profile["heat_tolerance"] * 2.5)
    rain_tolerance = 10.0 + (profile["rain_tolerance"] * 14.0)
    humidity_tolerance = 8.0 + (profile["rain_tolerance"] * 8.0)
    moisture_tolerance = 7.0 + (profile["rain_tolerance"] * 7.0)

    temp_score = normalize(temperature, profile["opt_temp"], temp_tolerance)
    rain_score = normalize(rainfall, profile["opt_rainfall"], rain_tolerance)
    humidity_score = normalize(humidity, profile["opt_humidity"], humidity_tolerance)
    moisture_score = normalize(soil_moisture, profile["opt_soil_moisture"], moisture_tolerance)

    heat_stress = calculate_heat_stress(temperature, profile["opt_temp"])
    rainfall_stress = calculate_rainfall_stress(rainfall, profile["opt_rainfall"])
    humidity_stress = calculate_humidity_stress(humidity, profile["opt_humidity"])
    soil_moisture_stress = calculate_soil_moisture_stress(soil_moisture, profile["opt_soil_moisture"])

    agro_score = (
        (temp_score * 0.32) +
        (rain_score * 0.26) +
        (humidity_score * 0.18) +
        (moisture_score * 0.24)
    )

    return {
        "temperature": temperature,
        "rainfall": rainfall,
        "humidity": humidity,
        "soil_moisture": soil_moisture,
        "temp_score": temp_score,
        "rain_score": rain_score,
        "humidity_score": humidity_score,
        "moisture_score": moisture_score,
        "heat_stress": heat_stress,
        "rainfall_stress": rainfall_stress,
        "humidity_stress": humidity_stress,
        "soil_moisture_stress": soil_moisture_stress,
        "agro_score": agro_score
    }


def confidence_from_scores(*scores: float) -> float:
    cleaned = [clamp(safe_float(score, 50.0), 0.0, 100.0) for score in scores if score is not None]
    if not cleaned:
        return 70.0

    mean_score = sum(cleaned) / len(cleaned)
    variance = sum((score - mean_score) ** 2 for score in cleaned) / len(cleaned)
    std_dev = math.sqrt(variance)

    stability = clamp(100.0 - (std_dev * 2.3), 0.0, 100.0)
    confidence = (mean_score * 0.78) + (stability * 0.22)

    return round(clamp(confidence, 0.0, 100.0), 1)


def chart_points(labels: List[str], values: List[float], key: str = "value") -> List[Dict[str, float]]:
    rows: List[Dict[str, float]] = []

    for index, label in enumerate(labels):
        value = values[index] if index < len(values) else values[-1]
        rows.append({"label": label, key: round(float(value), 2)})

    return rows


def recommendation_sentence(prefix: str, value: str) -> str:
    return f"{prefix} {value}."


def growth_curve_by_crop(crop_name: str, final_yield: float) -> List[float]:
    # Stage growth factors (germination → vegetative → flowering → grain fill → maturity → harvest)
    stage_profiles: Dict[str, List[float]] = {
        "Tomato":    [0.14, 0.31, 0.52, 0.71, 0.88, 1.0],
        "Rice":      [0.18, 0.36, 0.58, 0.78, 0.92, 1.0],
        "Wheat":     [0.17, 0.34, 0.56, 0.77, 0.91, 1.0],
        "Cotton":    [0.12, 0.28, 0.49, 0.69, 0.86, 1.0],
        "Maize":     [0.16, 0.33, 0.55, 0.75, 0.90, 1.0],
        "Soybean":   [0.15, 0.30, 0.53, 0.73, 0.89, 1.0],
        "Groundnut": [0.13, 0.29, 0.50, 0.71, 0.88, 1.0],
        # New crops
        "Potato":    [0.10, 0.26, 0.48, 0.68, 0.87, 1.0],  # tuber bulking is late
        "Sugarcane": [0.08, 0.22, 0.44, 0.65, 0.84, 1.0],  # very long duration
        "Mango":     [0.12, 0.28, 0.50, 0.70, 0.88, 1.0],  # tree crop
        "Banana":    [0.15, 0.32, 0.54, 0.74, 0.90, 1.0],  # fast bunch fill
        "Grapes":    [0.11, 0.27, 0.48, 0.68, 0.86, 1.0],  # berry development
        "Onion":     [0.16, 0.34, 0.55, 0.74, 0.90, 1.0],  # bulb formation
        "Sunflower": [0.14, 0.30, 0.52, 0.72, 0.89, 1.0],  # head filling
    }

    profile_key = (crop_name or "Tomato").strip().title()
    factors = stage_profiles.get(profile_key, stage_profiles["Tomato"])
    safe_yield = max(safe_float(final_yield, 1.0), 0.1)

    return [round(safe_yield * factor, 3) for factor in factors]


def likely_pest(crop_type: str, humidity: float = None, temperature: float = None) -> str:
    key = (crop_type or "tomato").strip().lower()

    humidity_value = safe_float(humidity, 65.0, 0.0, 100.0)
    temperature_value = safe_float(temperature, 28.0, -10.0, 55.0)

    # High humidity + moderate temp → fungal/sucking pests
    fungal_pests = {
        "tomato":    "Late Blight",
        "rice":      "Blast Disease",
        "wheat":     "Yellow Rust",
        "cotton":    "Alternaria Leaf Spot",
        "maize":     "Northern Leaf Blight",
        "soybean":   "Soybean Rust",
        "groundnut": "Tikka Leaf Spot",
        "potato":    "Late Blight",
        "sugarcane": "Red Rot",
        "mango":     "Anthracnose",
        "banana":    "Sigatoka Leaf Spot",
        "grapes":    "Downy Mildew",
        "onion":     "Purple Blotch",
        "sunflower": "Alternaria Leaf Blight",
    }
    # Dry heat → chewing/boring pests
    chewing_pests = {
        "tomato":    "Fruit Borer",
        "rice":      "Stem Borer",
        "wheat":     "Armyworm",
        "cotton":    "Bollworm",
        "maize":     "Fall Armyworm",
        "soybean":   "Semilooper",
        "groundnut": "Leaf Miner",
        "potato":    "Potato Tuber Moth",
        "sugarcane": "Top Borer",
        "mango":     "Fruit Fly",
        "banana":    "Banana Weevil",
        "grapes":    "Thrips",
        "onion":     "Onion Fly",
        "sunflower": "Capitulum Borer",
    }

    if humidity_value >= 78.0 and 22.0 <= temperature_value <= 34.0:
        return fungal_pests.get(key, "Fungal Leaf Spot")

    if temperature_value >= 33.0 and humidity_value <= 50.0:
        return chewing_pests.get(key, "Chewing Caterpillar")

    return PEST_BY_CROP.get(key, "Aphids")


def module_envelope(
    key: str,
    title: str,
    result_label: str,
    result_value: str,
    confidence: float,
    recommendation: str,
    explanation: str,
    chart_type: str,
    chart_data: List[Dict],
    metrics: List[Dict],
    model_name: str,
    model_family: str
) -> Dict:
    band = "Very High" if confidence >= 90 else "High" if confidence >= 80 else "Medium" if confidence >= 68 else "Low"

    return {
        "key": key,
        "title": title,
        "result": {
            "label": result_label,
            "value": result_value
        },
        "confidence": round(float(confidence), 1),
        "confidenceBand": band,
        "recommendation": recommendation,
        "explanation": explanation,
        "chart": {
            "type": chart_type,
            "xKey": "label",
            "yKey": "value",
            "data": chart_data
        },
        "metrics": metrics,
        "model": {
            "name": model_name,
            "family": model_family,
            "version": "1.0"
        }
    }
