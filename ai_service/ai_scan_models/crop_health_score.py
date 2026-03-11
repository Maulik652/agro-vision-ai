from typing import Dict

from .common import (
    clamp,
    ensemble_confidence,
    extract_features,
    model_inference,
    pipeline_snapshot,
    preprocess_image,
    safe_float,
    severity_to_score,
    validate_payload
)
from .crop_disease_detection import predict as disease_predict
from .pest_detection import predict as pest_predict
from .nutrient_deficiency_detection import predict as nutrient_predict
from .weather_intelligence_service import get_weather_context


def predict(payload: Dict) -> Dict:
    validate_payload(payload)

    disease_output = disease_predict(payload)
    pest_output = pest_predict(payload)
    nutrient_output = nutrient_predict(payload)

    disease = disease_output["disease"]
    pest = pest_output["pest"]
    nutrient = nutrient_output["nutrient"]

    disease_source = disease_output.get("sourceCrop", {})
    pest_source = pest_output.get("sourceCrop", {})
    nutrient_source = nutrient_output.get("sourceCrop", {})

    disease_pressure = severity_to_score(disease["severity"])
    pest_pressure = severity_to_score(pest["damageLevel"])
    nutrient_pressure = severity_to_score(nutrient["severity"])

    crop_key = str((disease_output.get("sourceCrop") or {}).get("used") or payload.get("cropType") or "tomato").strip().lower()
    weather_context = get_weather_context(payload, crop_key)
    weather_pressure = safe_float(weather_context.get("riskScore"), 0.0)

    image_base64 = str(payload.get("imageBase64") or "")
    preprocessed = preprocess_image(image_base64, str(payload.get("mimeType") or "image/jpeg"))
    features = extract_features(preprocessed, str(payload.get("cropType") or "tomato").lower())
    inference = model_inference(features, "health-score")

    green_ratio = safe_float(features.get("greenLeafRatio"), 0.58)
    lesion_ratio = safe_float(features.get("lesionAreaRatio"), 0.08)
    feature_clarity = safe_float(features.get("featureClarity"), 70.0)

    baseline_leaf_condition = clamp(
        44.0 + (green_ratio * 52.0) - (lesion_ratio * 35.0) + (feature_clarity * 0.2),
        20.0,
        98.0,
    )

    stress_index = (
        (disease_pressure * 0.32)
        + (pest_pressure * 0.24)
        + (nutrient_pressure * 0.20)
        + (weather_pressure * 0.24)
    )

    health_score = clamp(
        (baseline_leaf_condition * 0.48) + ((100.0 - stress_index) * 0.52),
        8.0,
        98.0,
    )

    indicators = {
        "leafCondition": round(clamp((green_ratio * 100.0) + 18.0, 8, 99), 1),
        "pestPresence": round(clamp(100 - pest_pressure, 8, 98), 1),
        "diseaseSeverity": round(clamp(100 - disease_pressure, 6, 96), 1),
        "nutrientBalance": round(clamp(100 - nutrient_pressure, 6, 96), 1)
    }

    source_matches = [
        bool(disease_source.get("isPayloadMatch", True)),
        bool(pest_source.get("isPayloadMatch", True)),
        bool(nutrient_source.get("isPayloadMatch", True))
    ]
    crop_match_ratio = (sum(1 for value in source_matches if value) / len(source_matches)) if source_matches else 1.0

    module_confidence = (
        float(disease.get("confidence", 70))
        + float(pest.get("confidence", 70))
        + float(nutrient.get("confidence", 70))
    ) / 3.0

    data_confidence = ensemble_confidence(
        [
            float(disease.get("confidence", 70)),
            float(pest.get("confidence", 70)),
            float(nutrient.get("confidence", 70)),
            safe_float(inference.get("rawScore"), 70.0),
        ],
        image_quality=safe_float(preprocessed.get("imageQuality"), 70.0),
        feature_clarity=feature_clarity,
        weather_risk=weather_pressure,
    )
    data_confidence = clamp((data_confidence * 0.82) + (crop_match_ratio * 100.0 * 0.18), 35.0, 99.0)
    quality_flag = "High" if data_confidence >= 84 else "Medium" if data_confidence >= 72 else "Low"

    inference_details = {
        **inference,
        "weatherRisk": round(weather_pressure, 1),
        "stressIndex": round(stress_index, 1),
        "ensembleConfidence": round(data_confidence, 1),
    }

    return {
        "module": "health-score",
        "title": "AI Crop Health Analysis",
        "health": {
            "score": round(float(health_score), 1),
            "label": "Healthy" if health_score >= 80 else "Monitor" if health_score >= 60 else "Critical",
            "indicators": indicators,
            "confidence": round(float(data_confidence), 1),
            "dataQuality": quality_flag
        },
        "quality": {
            "cropMatchRatio": round(crop_match_ratio, 2),
            "moduleConfidence": round(module_confidence, 1),
            "flag": quality_flag
        },
        "pipeline": pipeline_snapshot(preprocessed, features, inference_details)
    }
