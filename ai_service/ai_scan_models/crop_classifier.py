from typing import Dict

from .common import (
    crop_display_name,
    confidence_scoring,
    extract_features,
    infer_crop_from_features,
    model_inference,
    pipeline_snapshot,
    preprocess_image,
    sanitize_crop_type,
    validate_payload
)


def predict(payload: Dict) -> Dict:
    validate_payload(payload)

    selected_crop_key = sanitize_crop_type(payload.get("cropType", "tomato"))

    preprocessed = preprocess_image(str(payload.get("imageBase64") or ""), str(payload.get("mimeType") or "image/jpeg"))
    features = extract_features(preprocessed, selected_crop_key)
    crop_inference = infer_crop_from_features(features, selected_crop_key)

    use_inferred_crop = crop_inference["confidence"] >= 66
    crop_key = crop_inference["predictedCropKey"] if use_inferred_crop else selected_crop_key
    crop_name = crop_display_name(crop_key)

    inference = model_inference(features, "crop")

    confidence = confidence_scoring(
        base_confidence=crop_inference["confidence"],
        inference=inference,
        image_factor=preprocessed.get("qualityFactor", 0.7),
        feature_clarity=features.get("featureClarity", 70.0),
        weather_risk=0.0,
        model_confidence=crop_inference["confidence"],
    )

    if not crop_inference["isPayloadMatch"] and use_inferred_crop:
        note = "Selected crop differs from image-inferred crop; model used inferred crop profile."
    elif not use_inferred_crop:
        note = "Image crop inference confidence was low; model used selected crop profile."
    else:
        note = "Selected crop and image features are aligned."

    return {
        "module": "crop",
        "title": "Crop Classification",
        "crop": {
            "name": crop_name,
            "confidence": confidence,
            "family": (
                "Cereal Crop" if crop_key in {"rice", "wheat", "maize"}
                else "Cash Crop" if crop_key in {"cotton", "sugarcane", "groundnut", "soybean", "sunflower"}
                else "Vegetable Crop" if crop_key in {"tomato", "potato", "onion"}
                else "Fruit Crop" if crop_key in {"mango", "banana", "grapes"}
                else "Field Crop"
            ),
            "selectedCrop": crop_display_name(selected_crop_key),
            "usedProfile": crop_display_name(crop_key),
            "isSelectedCropMatch": crop_inference["isPayloadMatch"],
            "alternatives": crop_inference["alternatives"]
        },
        "reliability": {
            "agreement": crop_inference["agreement"],
            "inferenceConfidence": crop_inference["confidence"],
            "note": note
        },
        "pipeline": pipeline_snapshot(preprocessed, features, inference)
    }
