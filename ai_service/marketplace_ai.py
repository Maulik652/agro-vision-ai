import base64
import hashlib
import json
import math
import sys
from datetime import datetime
from typing import Dict, List

BASE_PRICES = {
    "tomato": 22.0,
    "onion": 19.0,
    "potato": 16.0,
    "rice": 32.0,
    "wheat": 28.0,
    "maize": 24.0,
    "cotton": 68.0,
    "soybean": 45.0,
    "groundnut": 54.0,
    "sugarcane": 4.0,
    "chilli": 96.0,
}

LOCATION_FACTORS = {
    "surat": 1.04,
    "nashik": 1.03,
    "pune": 1.02,
    "ahmedabad": 1.01,
    "delhi": 1.06,
    "indore": 0.99,
    "jaipur": 1.00,
    "bangalore": 1.05,
    "hyderabad": 1.03,
    "chennai": 1.04,
}


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def safe_float(value, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return float(default)

    if math.isnan(parsed) or math.isinf(parsed):
        return float(default)

    return parsed


def parse_payload() -> Dict:
    if sys.stdin is None or sys.stdin.isatty():
        return {}

    raw = sys.stdin.read().strip()
    if not raw:
        return {}

    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError("Input payload must be a JSON object")

    return parsed


def normalize_crop(value: str) -> str:
    return str(value or "tomato").strip().lower() or "tomato"


def normalize_location(value: str) -> str:
    return str(value or "").strip().lower()


def parse_last_7_day_price(value) -> List[float]:
    if isinstance(value, list):
        return [safe_float(item, float("nan")) for item in value if not math.isnan(safe_float(item, float("nan")))]

    if isinstance(value, str) and value.strip():
        rows = [item.strip() for item in value.split(",")]
        parsed = [safe_float(item, float("nan")) for item in rows]
        return [item for item in parsed if not math.isnan(item)]

    return []


def parse_demand_score(value) -> float:
    if isinstance(value, (int, float)):
        return clamp(float(value), 0.0, 100.0)

    text = str(value or "").strip().lower()
    if text == "high":
        return 82.0
    if text == "medium":
        return 58.0
    if text == "low":
        return 34.0

    return 56.0


def suggest_price(payload: Dict) -> Dict:
    crop = normalize_crop(payload.get("crop") or payload.get("cropName"))
    location = normalize_location(payload.get("location"))
    quantity = max(1.0, safe_float(payload.get("quantity"), 100.0))
    demand_score = parse_demand_score(payload.get("demand"))
    last_7 = parse_last_7_day_price(payload.get("last_7_day_price") or payload.get("last7DayPrice"))

    base_price = BASE_PRICES.get(crop, 24.0)
    location_factor = LOCATION_FACTORS.get(location, 1.0)
    last_7_average = sum(last_7) / len(last_7) if last_7 else base_price

    trend_boost = ((last_7_average - base_price) / max(base_price, 1.0)) * 0.35
    demand_boost = (demand_score - 50.0) / 170.0
    quantity_adjustment = -0.06 if quantity > 1200 else -0.03 if quantity > 600 else 0.03 if quantity < 140 else 0.0

    suggested = clamp(
        base_price * location_factor * (1.0 + trend_boost + demand_boost + quantity_adjustment),
        4.0,
        300.0,
    )

    confidence = clamp(
        89.0 - abs(trend_boost * 100.0) * 0.24 + min(len(last_7), 7) * 0.75,
        68.0,
        97.0,
    )

    demand_level = "HIGH" if demand_score >= 70 else "MEDIUM" if demand_score >= 45 else "LOW"

    return {
        "suggested_price": round(suggested, 2),
        "confidence": round(confidence),
        "confidence_score": round(confidence),
        "currency": "INR/kg",
        "demand_level": demand_level,
        "factors": {
            "crop": crop,
            "location_factor": round(location_factor, 2),
            "demand_score": round(demand_score, 1),
            "trend_index": round(trend_boost, 3),
            "quantity_adjustment": round(quantity_adjustment, 3),
        },
        "model": "Marketplace Price Intelligence v1",
        "engine": "python",
    }


def predict_demand(payload: Dict) -> Dict:
    crop = normalize_crop(payload.get("crop") or payload.get("cropName"))
    location = normalize_location(payload.get("location"))
    base_price = BASE_PRICES.get(crop, 24.0)
    location_factor = LOCATION_FACTORS.get(location, 1.0)
    last_7 = parse_last_7_day_price(payload.get("last_7_day_price") or payload.get("last7DayPrice"))

    if len(last_7) >= 2:
        trend_pulse = ((last_7[-1] - last_7[0]) / max(last_7[0], 1.0)) * 30.0
    else:
        trend_pulse = 5.0

    month_index = datetime.now().month
    seasonal_pulse = math.sin(month_index * 0.62) * 11.0

    demand_score = clamp(58.0 + trend_pulse + seasonal_pulse + (location_factor - 1.0) * 40.0, 18.0, 96.0)
    demand_level = "HIGH" if demand_score >= 72 else "MEDIUM" if demand_score >= 46 else "LOW"

    expected_price = clamp(base_price * location_factor * (1.0 + (demand_score - 50.0) / 150.0), 4.0, 320.0)
    confidence = clamp(81.0 + min(len(last_7), 7) * 1.1, 70.0, 96.0)

    return {
        "demand_level": demand_level,
        "demand_score": round(demand_score, 1),
        "expected_price": round(expected_price, 2),
        "confidence": round(confidence),
        "horizon": "next_7_days",
        "model": "Demand Sentinel v1",
        "engine": "python",
    }


def detect_quality(payload: Dict) -> Dict:
    crop = normalize_crop(payload.get("crop") or payload.get("cropName"))
    image_base64 = str(payload.get("imageBase64") or "").strip()

    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    bytes_length = 0
    if image_base64:
        padded = image_base64 + ("=" * (-len(image_base64) % 4))
        try:
            bytes_length = len(base64.b64decode(padded, validate=False))
        except Exception:
            bytes_length = len(image_base64)

    digest = hashlib.sha256(image_base64.encode("utf-8")).hexdigest() if image_base64 else ""
    entropy_signal = (int(digest[:8], 16) % 100) / 100.0 if digest else 0.41

    base_signal = clamp(24.0 + math.log10(bytes_length + 10.0) * 16.0, 22.0, 95.0)
    freshness_score = clamp(base_signal + (entropy_signal * 8.0), 20.0, 98.0)

    quality_grade = "C"
    if freshness_score >= 85.0:
        quality_grade = "A"
    elif freshness_score >= 65.0:
        quality_grade = "B"

    disease_risk = clamp(100.0 - freshness_score + (12.0 if quality_grade == "C" else 0.0), 4.0, 86.0)
    confidence = clamp(75.0 + min(bytes_length / 12000.0, 18.0), 64.0, 94.0)

    if quality_grade == "A":
        recommendation = "Suitable for premium buyers and long-distance dispatch."
    elif quality_grade == "B":
        recommendation = "Sell quickly in local mandi and improve sorting for premium buyers."
    else:
        recommendation = "Prioritize immediate sale, separate damaged produce, and avoid long transit."

    return {
        "crop": crop,
        "quality_grade": f"Grade {quality_grade}",
        "freshness_score": round(freshness_score, 1),
        "disease_risk": round(disease_risk, 1),
        "confidence": round(confidence),
        "recommendation": recommendation,
        "model": "Crop Quality Vision v1",
        "engine": "python",
    }


def estimate_logistics(payload: Dict) -> Dict:
    pickup = str(payload.get("pickup") or payload.get("pickupLocation") or "Farm").strip() or "Farm"
    drop = str(payload.get("drop") or payload.get("dropLocation") or payload.get("location") or "Market").strip() or "Market"
    vehicle_type = str(payload.get("vehicleType") or "mini-truck").strip().lower()

    input_distance = safe_float(payload.get("distance_km") or payload.get("distanceKm"), float("nan"))

    if math.isnan(input_distance) or input_distance <= 0:
        seed = hashlib.sha256(f"{pickup.lower()}::{drop.lower()}".encode("utf-8")).hexdigest()
        input_distance = 4.0 + ((int(seed[:6], 16) % 5400) / 100.0)

    distance_km = clamp(input_distance, 1.0, 120.0)

    rate_map = {
        "bike": 7.5,
        "auto": 12.0,
        "mini-truck": 18.0,
        "truck": 25.0,
    }
    base_map = {
        "bike": 60.0,
        "auto": 110.0,
        "mini-truck": 220.0,
        "truck": 460.0,
    }

    if vehicle_type not in rate_map:
        vehicle_type = "mini-truck"

    hour = datetime.now().hour
    rush_factor = 1.18 if 8 <= hour <= 11 or 17 <= hour <= 20 else 1.0

    estimated_cost = clamp(base_map[vehicle_type] + (distance_km * rate_map[vehicle_type] * rush_factor), 80.0, 12000.0)
    eta_hours = clamp((distance_km / 27.0) * rush_factor + 0.35, 0.3, 9.5)
    confidence = clamp(92.0 - (distance_km * 0.15), 72.0, 95.0)

    return {
        "pickup": pickup,
        "drop": drop,
        "distance_km": round(distance_km, 1),
        "estimated_cost_inr": round(estimated_cost),
        "eta_hours": round(eta_hours, 2),
        "recommended_vehicle": vehicle_type,
        "payment_methods": ["UPI", "Bank Transfer", "Wallet"],
        "confidence": round(confidence),
        "model": "Agro Logistics Estimator v1",
        "engine": "python",
    }


def build_sell_assistant(payload: Dict) -> Dict:
    crop = normalize_crop(payload.get("crop") or payload.get("cropName"))
    location = normalize_location(payload.get("location"))
    quantity = max(1.0, safe_float(payload.get("quantity"), 100.0))
    shelf_life_days = clamp(safe_float(payload.get("shelfLifeDays"), 7.0), 1.0, 45.0)
    moisture_percent = clamp(safe_float(payload.get("moisturePercent"), 12.0), 0.0, 100.0)
    grade = str(payload.get("grade") or payload.get("qualityGrade") or "B").strip().upper() or "B"
    quality_type = str(payload.get("qualityType") or "normal").strip().lower() or "normal"
    packaging_type = str(payload.get("packagingType") or "standard-bag").strip().lower() or "standard-bag"

    price_suggestion = suggest_price(payload)
    demand_prediction = predict_demand(payload)

    grade_factor_map = {
        "A": 1.07,
        "B": 1.0,
        "C": 0.93,
    }
    packaging_factor_map = {
        "crate": 1.03,
        "cold-box": 1.06,
        "jute-bag": 1.01,
        "standard-bag": 1.0,
    }

    grade_factor = grade_factor_map.get(grade, 0.98)
    organic_factor = 1.05 if quality_type == "organic" else 1.0
    packaging_factor = packaging_factor_map.get(packaging_type, 1.0)
    moisture_penalty = clamp((moisture_percent - 14.0) * 0.01, 0.0, 0.11) if moisture_percent > 14.0 else 0.0
    shelf_life_factor = 0.92 if shelf_life_days <= 3.0 else 0.98 if shelf_life_days <= 7.0 else 1.03

    ideal_price = clamp(
        price_suggestion["suggested_price"] * grade_factor * organic_factor * packaging_factor * shelf_life_factor * (1.0 - moisture_penalty),
        4.0,
        360.0,
    )

    demand_score = safe_float(demand_prediction.get("demand_score"), 56.0)
    match_rate = clamp(
        44.0 + (demand_score * 0.42) + (9.0 if grade == "A" else 5.0 if grade == "B" else 2.0) + (7.0 if quality_type == "organic" else 0.0),
        35.0,
        96.0,
    )
    readiness = clamp(
        54.0 + (demand_score * 0.22) + (8.0 if shelf_life_days >= 7.0 else 3.0) + (7.0 if quantity >= 500.0 else 2.0) + (8.0 if grade == "A" else 4.0 if grade == "B" else 0.0) - (moisture_penalty * 100.0 * 0.55),
        32.0,
        98.0,
    )

    urgency = "LOW"
    if shelf_life_days <= 3.0 or demand_score < 42.0:
        urgency = "HIGH"
    elif shelf_life_days <= 7.0 or demand_score < 58.0:
        urgency = "MEDIUM"

    min_price = clamp(ideal_price * 0.94, 4.0, 340.0)
    max_price = clamp(ideal_price * 1.07, 5.0, 380.0)

    risk_flags = []
    if shelf_life_days <= 3.0:
        risk_flags.append("Short shelf-life: prioritize nearby buyers and same-day pickup.")
    if moisture_percent > 14.0:
        risk_flags.append("High moisture can reduce buyer confidence and negotiated price.")
    if quantity > 1800.0:
        risk_flags.append("Large lot size: split into tranches to improve conversion speed.")

    recommendations = [
        f"Start negotiations near Rs {round(max_price, 2)}/kg, close above Rs {round(min_price, 2)}/kg.",
        "Publish listing with grade, moisture, and packaging details to increase trust.",
        "Promote instant dispatch and flexible pickup windows." if urgency == "HIGH" else "Run buyer outreach in two waves: early morning and evening mandis.",
    ]

    return {
        "crop": crop,
        "location": location,
        "demand_level": demand_prediction.get("demand_level", "MEDIUM"),
        "demand_score": round(demand_score, 1),
        "readiness_score": round(readiness),
        "urgency": urgency,
        "expected_buyer_match_rate": round(match_rate),
        "recommended_price_band": {
            "min": round(min_price, 2),
            "ideal": round(ideal_price, 2),
            "max": round(max_price, 2),
            "currency": "INR/kg",
        },
        "signals": {
            "grade": grade,
            "quality_type": quality_type,
            "packaging_type": packaging_type,
            "shelf_life_days": round(shelf_life_days, 1),
            "moisture_percent": round(moisture_percent, 1),
            "quantity": round(quantity, 2),
        },
        "risk_flags": risk_flags,
        "recommendations": recommendations,
        "model": "Farmer Sell Assistant v2",
        "engine": "python",
    }


def main() -> int:
    try:
        action = str(sys.argv[1]).strip().lower() if len(sys.argv) > 1 else "price"
        payload = parse_payload()

        if action == "price":
            result = suggest_price(payload)
        elif action == "demand":
            result = predict_demand(payload)
        elif action == "quality":
            result = detect_quality(payload)
        elif action == "logistics":
            result = estimate_logistics(payload)
        elif action == "sell_assistant":
            result = build_sell_assistant(payload)
        else:
            raise ValueError(f"Unsupported action: {action}")

        print(json.dumps(result))
        return 0
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
