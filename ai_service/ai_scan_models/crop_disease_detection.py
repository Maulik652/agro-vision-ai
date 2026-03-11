from typing import Dict

from .common import (
    DISEASE_LIBRARY,
    clamp,
    crop_display_name,
    chart_points,
    confidence_scoring,
    extract_features,
    infer_crop_from_features,
    model_inference,
    pipeline_snapshot,
    preprocess_image,
    sanitize_crop_type,
    validate_payload
)
from .cnn_disease_model import predict_disease
from .weather_intelligence_service import get_weather_context


def predict(payload: Dict) -> Dict:
    validate_payload(payload)

    selected_crop_key = sanitize_crop_type(payload.get("cropType", "tomato"))

    preprocessed = preprocess_image(str(payload.get("imageBase64") or ""), str(payload.get("mimeType") or "image/jpeg"))
    features = extract_features(preprocessed, selected_crop_key)

    crop_inference = infer_crop_from_features(features, selected_crop_key)
    use_inferred_crop = crop_inference["confidence"] >= 68
    crop_key = crop_inference["predictedCropKey"] if use_inferred_crop else selected_crop_key

    weather_context = get_weather_context(payload, crop_key)
    cnn_result = predict_disease(preprocessed, features, crop_key, weather_context)
    disease_template = DISEASE_LIBRARY[crop_key]

    inference = model_inference(features, "disease")
    confidence = confidence_scoring(
        base_confidence=disease_template["confidence"],
        inference=inference,
        image_factor=preprocessed.get("qualityFactor", 0.7),
        feature_clarity=features.get("featureClarity", 70.0),
        weather_risk=weather_context.get("riskScore", 0.0),
        model_confidence=cnn_result.get("confidence_score"),
    )

    if not crop_inference["isPayloadMatch"] and use_inferred_crop:
        confidence = max(62.0, confidence - 5.5)
    elif crop_inference["confidence"] < 68:
        confidence = max(62.0, confidence - 7.0)

    probabilities = cnn_result.get("probability_curve") or disease_template["probability"]
    quality_gain = 0.7 + (preprocessed.get("qualityFactor", 0.7) * 0.3)
    probabilities = [clamp(value * quality_gain, 5.0, 99.0) for value in probabilities]

    disease_name = str(cnn_result.get("disease_name") or disease_template["name"])
    disease_severity = str(cnn_result.get("severity") or disease_template["severity"])

    if disease_name.lower() == "healthy leaf":
        recommendation = "No major disease signature detected. Continue preventive monitoring and re-scan in 5-7 days."
    elif disease_severity in {"High", "Severe"}:
        recommendation = f"Urgent disease control needed for {disease_name}. Start treatment in 24-48 hours and isolate affected leaves."
    else:
        recommendation = disease_template["recommendation"]

    if weather_context.get("humidityDiseaseRisk", 0.0) >= 55.0:
        recommendation += " High humidity risk detected; improve canopy airflow and avoid overhead irrigation."

    explanation = (
        f"Detected lesion ratio {round(features.get('lesionAreaRatio', 0.0) * 100, 1)}%, "
        f"spot clustering {round(features.get('spotClusterScore', 0.0), 1)}, and weather risk {round(weather_context.get('riskScore', 0.0), 1)} "
        f"indicate {disease_severity.lower()} disease pressure."
    )

    if cnn_result.get("modelLoaded"):
        explanation += " CNN disease model inference was applied on the processed leaf tensor."
    else:
        explanation += " CNN model was unavailable; feature-based diagnostic fallback was used."

    if not crop_inference["isPayloadMatch"]:
        recommendation += " Re-scan with clear full-plant image to verify crop and disease alignment."

    if crop_inference["agreement"] == "low":
        explanation += " Crop signal from image is weak, so this result has lower reliability."

    reliability_level = "High" if confidence >= 85 else "Medium" if confidence >= 72 else "Low"

    inference_details = {
        **inference,
        "cnnEngine": cnn_result.get("engine"),
        "cnnModelLoaded": bool(cnn_result.get("modelLoaded")),
        "weatherRisk": weather_context.get("riskScore"),
    }

    return {
        "module": "disease",
        "title": "Crop Disease Detection",
        "disease": {
            "name": disease_name,
            "severity": disease_severity,
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
            "type": "line",
            "xKey": "label",
            "yKey": "value",
            "data": chart_points(["S1", "S2", "S3", "S4", "S5", "Now"], probabilities)
        },
        "pipeline": pipeline_snapshot(preprocessed, features, inference_details)
    }
