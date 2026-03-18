import os
from typing import Dict, List, Optional, Tuple

from .common import (
    CROP_PROFILES,
    chart_points,
    clamp,
    confidence_from_scores,
    environment_scores,
    module_envelope,
    soil_factor,
    normalize,
    safe_float
)

try:
    import joblib as _joblib
    import numpy as _np
    _HAS_JOBLIB = True
except ImportError:
    _HAS_JOBLIB = False

# ── Trained model loader (loaded once at import time) ─────────────────────────
_MODEL_BUNDLE: Optional[Dict] = None
_MODEL_LOADED = False

def _load_trained_model() -> Optional[Dict]:
    """
    Load the trained crop recommendation model bundle from disk.
    Returns None if not available — caller falls back to scoring engine.
    """
    global _MODEL_BUNDLE, _MODEL_LOADED
    if _MODEL_LOADED:
        return _MODEL_BUNDLE

    _MODEL_LOADED = True

    if not _HAS_JOBLIB:
        return None

    # Check env var first, then default path
    model_path = os.getenv(
        "CROP_RECOMMENDATION_MODEL_PATH",
        os.path.join(os.path.dirname(__file__), "..", "saved_models", "crop_recommendation_model.pkl"),
    )
    model_path = os.path.normpath(model_path)

    if not os.path.exists(model_path):
        return None

    try:
        bundle = _joblib.load(model_path)
        # Validate bundle has required keys
        if all(k in bundle for k in ("model", "scaler", "encoder", "features")):
            _MODEL_BUNDLE = bundle
            print(f"[crop_recommendation] Loaded trained model from {model_path}")
        else:
            print(f"[crop_recommendation] Model bundle missing keys, using scoring engine")
    except Exception as exc:
        print(f"[crop_recommendation] Failed to load model ({exc}), using scoring engine")

    return _MODEL_BUNDLE


def _predict_with_trained_model(payload: Dict) -> Optional[List[Tuple[str, float]]]:
    """
    Run inference using the trained XGBoost/RF model.
    Returns ranked list of (crop_name, confidence_score) or None if unavailable.
    """
    bundle = _load_trained_model()
    if bundle is None:
        return None

    try:
        features = bundle["features"]  # ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
        feature_map = {
            "N":           safe_float(payload.get("nitrogen"),     50.0, 0.0, 200.0),
            "P":           safe_float(payload.get("phosphorus"),   50.0, 0.0, 200.0),
            "K":           safe_float(payload.get("potassium"),    50.0, 0.0, 200.0),
            "temperature": safe_float(payload.get("temperature"),  25.0, -10.0, 55.0),
            "humidity":    safe_float(payload.get("humidity"),     60.0, 5.0, 100.0),
            "ph":          safe_float(payload.get("ph"),            6.5, 3.0, 10.0),
            "rainfall":    safe_float(payload.get("rainfall"),    100.0, 0.0, 500.0),
        }

        X_raw = _np.array([[feature_map[f] for f in features]], dtype=float)
        X_scaled = bundle["scaler"].transform(X_raw)

        model = bundle["model"]
        encoder = bundle["encoder"]

        # Get probability distribution over all classes
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X_scaled)[0]
            ranked_idx = _np.argsort(proba)[::-1]
            results = []
            for idx in ranked_idx[:3]:
                crop_name = encoder.inverse_transform([idx])[0]
                score = float(proba[idx]) * 100.0
                results.append((str(crop_name).title(), round(score, 1)))
            return results
        else:
            # Fallback: single prediction only
            pred = model.predict(X_scaled)[0]
            crop_name = encoder.inverse_transform([pred])[0]
            return [(str(crop_name).title(), 85.0)]

    except Exception as exc:
        print(f"[crop_recommendation] Trained model inference failed ({exc}), using scoring engine")
        return None


def _score_crop(crop_name: str, payload: Dict, scores: Dict) -> float:
    profile = CROP_PROFILES[crop_name]

    temp = safe_float(payload.get("temperature"), scores["temperature"], -10.0, 55.0)
    rainfall = safe_float(payload.get("rainfall"), scores["rainfall"], 0.0, 500.0)
    humidity = safe_float(payload.get("humidity"), scores["humidity"], 5.0, 100.0)
    soil_moisture = safe_float(payload.get("soilMoisture"), scores["soil_moisture"], 5.0, 100.0)

    temp_score = normalize(temp, profile["opt_temp"], 2.8 + (profile["heat_tolerance"] * 2.5))
    rainfall_suitability = normalize(rainfall, profile["opt_rainfall"], 10.0 + (profile["rain_tolerance"] * 14.0))
    humidity_score = normalize(humidity, profile["opt_humidity"], 8.0 + (profile["rain_tolerance"] * 8.0))
    moisture_score = normalize(soil_moisture, profile["opt_soil_moisture"], 7.0 + (profile["rain_tolerance"] * 7.0))

    base = (
        (temp_score * 0.3) +
        (rainfall_suitability * 0.24) +
        (humidity_score * 0.16) +
        (moisture_score * 0.2) +
        (scores["agro_score"] * 0.1)
    )

    soil_multiplier = soil_factor(payload.get("soilType", "loamy"))
    soil_suitability_multiplier = clamp(0.86 + (soil_multiplier * 0.14), 0.78, 1.05)
    temp_deviation_penalty = clamp(
        abs(temp - profile["opt_temp"]) * (1.25 - (profile["heat_tolerance"] * 0.45)),
        0.0,
        20.0
    )

    adjusted = clamp((base * soil_suitability_multiplier) - temp_deviation_penalty, 30.0, 99.0)

    return adjusted


def predict(payload: Dict) -> Dict:
    # ── Try trained ML model first ────────────────────────────────────────────
    trained_results = _predict_with_trained_model(payload)

    if trained_results is not None and len(trained_results) >= 3:
        top_three = trained_results[:3]
        confidence = confidence_from_scores(top_three[0][1], top_three[1][1], top_three[2][1])
        model_name   = "Crop Recommendation XGBoost/RF"
        model_family = "Trained ML Ensemble"
    else:
        # ── Fallback: deterministic scoring engine ────────────────────────────
        scores = environment_scores(payload)
        crop_scores: List[Tuple[str, float]] = [
            (crop_name, _score_crop(crop_name, payload, scores))
            for crop_name in CROP_PROFILES
        ]
        ranked    = sorted(crop_scores, key=lambda row: row[1], reverse=True)
        top_three = ranked[:3]
        confidence   = confidence_from_scores(top_three[0][1], top_three[1][1], top_three[2][1])
        model_name   = "Crop Suitability Ranker"
        model_family = "Deterministic Agronomy Model"

    recommendation = (
        "Top recommendations align with rainfall suitability, soil conditions, and current temperature behavior."
    )
    explanation = (
        f"Top crops are ranked by climate fit, rainfall suitability, and soil-adjusted score: "
        f"{top_three[0][0]}, {top_three[1][0]}, {top_three[2][0]}."
    )

    chart_data = chart_points(
        [name for name, _ in top_three],
        [score for _, score in top_three]
    )

    return module_envelope(
        key="crop",
        title="AI Best Crop Recommendation",
        result_label="Top Recommended Crops",
        result_value=", ".join([name for name, _ in top_three]),
        confidence=confidence,
        recommendation=recommendation,
        explanation=explanation,
        chart_type="bar",
        chart_data=chart_data,
        metrics=[
            {"label": "1st Choice", "value": f"{top_three[0][0]} ({round(top_three[0][1], 1)})"},
            {"label": "2nd Choice", "value": f"{top_three[1][0]} ({round(top_three[1][1], 1)})"},
            {"label": "3rd Choice", "value": f"{top_three[2][0]} ({round(top_three[2][1], 1)})"}
        ],
        model_name=model_name,
        model_family=model_family
    )
