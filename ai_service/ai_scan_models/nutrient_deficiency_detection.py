from typing import Dict

from .common import (
    NUTRIENT_LIBRARY,
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


def predict(payload: Dict) -> Dict:
    validate_payload(payload)

    selected_crop_key = sanitize_crop_type(payload.get("cropType", "tomato"))

    preprocessed = preprocess_image(str(payload.get("imageBase64") or ""), str(payload.get("mimeType") or "image/jpeg"))
    features = extract_features(preprocessed, selected_crop_key)

    crop_inference = infer_crop_from_features(features, selected_crop_key)
    use_inferred_crop = crop_inference["confidence"] >= 68
    crop_key = crop_inference["predictedCropKey"] if use_inferred_crop else selected_crop_key

    nutrient_template = NUTRIENT_LIBRARY[crop_key]
    weather_context = get_weather_context(payload, crop_key)

    inference = model_inference(features, "nutrient")

    yellow_ratio = safe_float(features.get("yellowAreaRatio"), 0.0)
    purple_ratio = safe_float(features.get("purpleTintRatio"), 0.0)
    edge_burn_ratio = safe_float(features.get("edgeBurnRatio"), 0.0)

    if purple_ratio >= max(yellow_ratio, edge_burn_ratio) and purple_ratio >= 0.035:
        nutrient_name = "Phosphorus Deficiency"
    elif edge_burn_ratio >= max(yellow_ratio, purple_ratio) and edge_burn_ratio >= 0.03:
        nutrient_name = "Potassium Deficiency"
    elif yellow_ratio >= 0.04:
        nutrient_name = "Nitrogen Deficiency"
    else:
        nutrient_name = nutrient_template["nutrient"]

    deficiency_score = clamp(
        (yellow_ratio * 100.0 * 0.48)
        + (purple_ratio * 100.0 * 0.28)
        + (edge_burn_ratio * 100.0 * 0.24)
        + (safe_float(weather_context.get("excessRainfallRisk"), 0.0) * 0.12),
        0.0,
        100.0,
    )

    if deficiency_score >= 80.0:
        severity = "High"
    elif deficiency_score >= 55.0:
        severity = "Moderate"
    elif deficiency_score >= 35.0:
        severity = "Medium"
    else:
        severity = "Low"

    confidence = confidence_scoring(
        base_confidence=nutrient_template["confidence"],
        inference=inference,
        image_factor=preprocessed.get("qualityFactor", 0.7),
        feature_clarity=features.get("featureClarity", 70.0),
        weather_risk=weather_context.get("riskScore", 0.0),
        model_confidence=100.0 - abs(deficiency_score - safe_float(inference.get("rawScore"), 50.0)),
    )

    if not crop_inference["isPayloadMatch"] and use_inferred_crop:
        confidence = max(62.0, confidence - 4.5)
    elif crop_inference["confidence"] < 68:
        confidence = max(62.0, confidence - 7.0)

    if nutrient_name == "Nitrogen Deficiency":
        recommendation = "Apply split nitrogen dose and maintain moderate irrigation for uptake."
    elif nutrient_name == "Phosphorus Deficiency":
        recommendation = "Apply phosphorus-rich fertilizer near root zone and support with organic matter."
    elif nutrient_name == "Potassium Deficiency":
        recommendation = "Apply potassium sulfate and monitor leaf edge burn reduction in 5-7 days."
    else:
        recommendation = nutrient_template["recommendation"]

    if safe_float(weather_context.get("excessRainfallRisk"), 0.0) >= 55.0:
        recommendation += " High rainfall risk may increase nutrient leaching; prefer split application."

    if not crop_inference["isPayloadMatch"]:
        recommendation += " Verify crop type and run second scan before final nutrient plan."

    reliability_level = "High" if confidence >= 85 else "Medium" if confidence >= 72 else "Low"

    explanation = (
        f"Yellow area {round(yellow_ratio * 100.0, 1)}%, purple tint {round(purple_ratio * 100.0, 1)}%, "
        f"and edge burn {round(edge_burn_ratio * 100.0, 1)}% indicate {severity.lower()} nutrient stress."
    )

    inference_details = {
        **inference,
        "weatherRisk": weather_context.get("riskScore"),
        "deficiencyScore": round(deficiency_score, 1),
    }

    return {
        "module": "nutrient",
        "title": "Nutrient Deficiency Detection",
        "nutrient": {
            "name": nutrient_name,
            "severity": severity,
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
            "type": "area",
            "xKey": "label",
            "yKey": "value",
            "data": chart_points(
                ["Base", "Current", "After 3 Days", "After 7 Days"],
                [
                    clamp(deficiency_score * 0.92, 5.0, 98.0),
                    clamp(deficiency_score, 5.0, 98.0),
                    clamp(deficiency_score * 0.84, 5.0, 98.0),
                    clamp(deficiency_score * 0.7, 5.0, 98.0),
                ]
            )
        },
        "pipeline": pipeline_snapshot(preprocessed, features, inference_details)
    }
