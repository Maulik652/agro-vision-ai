from typing import Dict

from .common import (
    PEST_LIBRARY,
    clamp,
    crop_display_name,
    chart_points,
    confidence_scoring,
    extract_features,
    infer_crop_from_features,
    model_inference,
    pipeline_snapshot,
    preprocess_image,
    safe_float,
    sanitize_crop_type,
    validate_payload
)
from .weather_intelligence_service import get_weather_context


CROP_PEST_SENSITIVITY = {
    "tomato": 1.02,
    "rice": 1.08,
    "wheat": 0.95,
    "cotton": 1.15,
    "maize": 1.12,
    "soybean": 0.98,
    "groundnut": 0.97,
}


def predict(payload: Dict) -> Dict:
    validate_payload(payload)

    selected_crop_key = sanitize_crop_type(payload.get("cropType", "tomato"))

    preprocessed = preprocess_image(str(payload.get("imageBase64") or ""), str(payload.get("mimeType") or "image/jpeg"))
    features = extract_features(preprocessed, selected_crop_key)

    crop_inference = infer_crop_from_features(features, selected_crop_key)
    use_inferred_crop = crop_inference["confidence"] >= 68
    crop_key = crop_inference["predictedCropKey"] if use_inferred_crop else selected_crop_key

    pest_template = PEST_LIBRARY[crop_key]
    weather_context = get_weather_context(payload, crop_key)

    humidity = safe_float(weather_context.get("humidity"), safe_float(payload.get("humidity"), 65.0))
    temperature = safe_float(weather_context.get("temperature"), safe_float(payload.get("temperature"), 28.0))
    rainfall = safe_float(weather_context.get("rainfall"), safe_float(payload.get("rainfall"), 80.0))
    soil_moisture = safe_float(payload.get("soilMoisture"), 55.0)

    humidity_pest_map = {
        "tomato": "Whitefly",
        "rice": "Brown Planthopper",
        "wheat": "Rust Mite",
        "cotton": "Whitefly",
        "maize": "Leafhopper",
        "soybean": "Aphids",
        "groundnut": "Leaf Miner",
    }
    dry_heat_pest_map = {
        "tomato": "Fruit Borer",
        "rice": "Stem Borer",
        "wheat": "Armyworm",
        "cotton": "Bollworm",
        "maize": "Fall Armyworm",
        "soybean": "Semilooper",
        "groundnut": "Leaf Miner",
    }

    if humidity >= 78.0 and temperature <= 34.0:
        pest_name = humidity_pest_map.get(crop_key, pest_template["name"])
    elif temperature >= 33.0 and humidity <= 54.0:
        pest_name = dry_heat_pest_map.get(crop_key, pest_template["name"])
    else:
        pest_name = pest_template["name"]

    inference = model_inference(features, "pest")

    hole_score = safe_float(features.get("leafHoleRatio"), 0.0) * 100.0
    chewing_score = safe_float(features.get("chewingDamageScore"), 0.0)
    edge_damage_score = safe_float(features.get("edgeDamageRatio"), 0.0) * 100.0

    humidity_pressure = clamp(max(0.0, humidity - 52.0) * 2.0, 0.0, 100.0)
    temperature_deviation = clamp(safe_float(weather_context.get("heatStress"), 0.0), 0.0, 100.0)
    soil_moisture_pressure = clamp(abs(soil_moisture - 58.0) * 1.5, 0.0, 100.0)
    rainfall_pressure = clamp((safe_float(weather_context.get("excessRainfallRisk"), 0.0) * 0.65) + (rainfall * 0.12), 0.0, 100.0)

    sensitivity = CROP_PEST_SENSITIVITY.get(crop_key, 1.0)
    risk_index = clamp(
        (
            (humidity_pressure * 0.18)
            + (temperature_deviation * 0.16)
            + (soil_moisture_pressure * 0.14)
            + (rainfall_pressure * 0.12)
            + (hole_score * 0.16)
            + (chewing_score * 0.14)
            + (edge_damage_score * 0.10)
        ) * sensitivity,
        0.0,
        100.0,
    )

    if risk_index > 70.0:
        risk_level = "High"
    elif risk_index >= 40.0:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    if risk_index >= 76.0:
        damage_level = "High"
    elif risk_index >= 45.0:
        damage_level = "Moderate"
    else:
        damage_level = "Low"

    confidence = confidence_scoring(
        base_confidence=pest_template["confidence"],
        inference=inference,
        image_factor=preprocessed.get("qualityFactor", 0.7),
        feature_clarity=features.get("featureClarity", 70.0),
        weather_risk=weather_context.get("riskScore", 0.0),
        model_confidence=100.0 - abs(risk_index - safe_float(inference.get("rawScore"), 50.0)),
    )

    if not crop_inference["isPayloadMatch"] and use_inferred_crop:
        confidence = max(62.0, confidence - 5.0)
    elif crop_inference["confidence"] < 68:
        confidence = max(62.0, confidence - 7.0)

    trend_base = clamp((risk_index * 0.74) + (chewing_score * 0.26), 5.0, 99.0)

    if risk_level == "High":
        recommendation = f"High pest pressure for {pest_name}. Start targeted control in 24 hours and scout affected plots daily."
    elif risk_level == "Medium":
        recommendation = f"Moderate {pest_name} risk. Increase scouting frequency and apply preventive biological control this week."
    else:
        recommendation = "Continue preventive scouting and maintain sticky trap monitoring."

    if safe_float(weather_context.get("excessRainfallRisk"), 0.0) >= 55.0:
        recommendation += " Wet-weather risk is elevated; monitor pest resurgence after rainfall."

    if not crop_inference["isPayloadMatch"]:
        recommendation += " Confirm crop identity and repeat scan before treatment purchase."

    reliability_level = "High" if confidence >= 85 else "Medium" if confidence >= 72 else "Low"

    explanation = (
        f"Leaf holes {round(hole_score, 1)}%, chewing damage {round(chewing_score, 1)}, edge damage {round(edge_damage_score, 1)}, "
        f"and weather risk {round(weather_context.get('riskScore', 0.0), 1)} indicate {risk_level.lower()} pest pressure."
    )

    inference_details = {
        **inference,
        "weatherRisk": weather_context.get("riskScore"),
        "riskIndex": round(risk_index, 1),
    }

    return {
        "module": "pest",
        "title": "Pest Damage Detection",
        "pest": {
            "name": pest_name,
            "damageLevel": damage_level,
            "riskLevel": risk_level,
            "confidence": confidence,
            "recommendation": recommendation,
            "explanation": explanation
        },
        "sourceCrop": {
            "selected": crop_display_name(selected_crop_key),
            "inferred": crop_inference["predictedCropName"],
            "used": crop_display_name(crop_key),
            "isPayloadMatch": crop_inference["isPayloadMatch"]
        },
        "reliability": {
            "level": reliability_level,
            "inferenceConfidence": crop_inference["confidence"],
            "agreement": crop_inference["agreement"]
        },
        "chart": {
            "type": "bar",
            "xKey": "label",
            "yKey": "value",
            "data": chart_points(
                ["Scout", "Field", "Current", "Projected"],
                [
                    clamp(trend_base * 0.62, 5.0, 97.0),
                    clamp(trend_base * 0.82, 5.0, 97.0),
                    clamp(trend_base, 5.0, 97.0),
                    clamp(trend_base * 1.08, 5.0, 97.0),
                ]
            )
        },
        "pipeline": pipeline_snapshot(preprocessed, features, inference_details)
    }
