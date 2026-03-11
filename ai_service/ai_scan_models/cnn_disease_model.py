import json
import os
from typing import Dict, List, Optional

import numpy as np

from .common import DISEASE_LIBRARY, clamp, safe_float, score_to_severity, sanitize_crop_type

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - environment fallback
    cv2 = None


_MODEL_CACHE = {
    "loaded": False,
    "path": None,
    "net": None,
    "labels": [],
}


def _default_labels() -> List[str]:
    names = sorted({entry.get("name", "Unknown Disease") for entry in DISEASE_LIBRARY.values()})
    if "Healthy Leaf" not in names:
        names.insert(0, "Healthy Leaf")
    return names


def _load_labels() -> List[str]:
    labels_path = os.getenv("SCAN_DISEASE_LABELS_PATH", "").strip()
    if not labels_path:
        return _default_labels()

    try:
        with open(labels_path, "r", encoding="utf-8") as handle:
            content = handle.read().strip()
    except OSError:
        return _default_labels()

    if not content:
        return _default_labels()

    try:
        parsed = json.loads(content)
        if isinstance(parsed, list):
            labels = [str(item).strip() for item in parsed if str(item).strip()]
            return labels or _default_labels()
    except json.JSONDecodeError:
        pass

    labels = [line.strip() for line in content.splitlines() if line.strip()]
    return labels or _default_labels()


def _model_path() -> Optional[str]:
    env_path = os.getenv("SCAN_DISEASE_MODEL_PATH", "").strip()
    if env_path:
        return env_path

    default_path = os.path.join(os.path.dirname(__file__), "models", "disease_mobilenet.onnx")
    if os.path.exists(default_path):
        return default_path

    return None


def _load_model() -> Dict:
    if _MODEL_CACHE["path"] is not None:
        return _MODEL_CACHE

    labels = _load_labels()
    path = _model_path()

    if cv2 is None or path is None or not os.path.exists(path):
        _MODEL_CACHE.update({
            "loaded": False,
            "path": path,
            "net": None,
            "labels": labels,
        })
        return _MODEL_CACHE

    try:
        net = cv2.dnn.readNetFromONNX(path)
        _MODEL_CACHE.update({
            "loaded": True,
            "path": path,
            "net": net,
            "labels": labels,
        })
    except Exception:
        _MODEL_CACHE.update({
            "loaded": False,
            "path": path,
            "net": None,
            "labels": labels,
        })

    return _MODEL_CACHE


def _softmax(values: np.ndarray) -> np.ndarray:
    shifted = values - np.max(values)
    exp_values = np.exp(shifted)
    denom = max(float(np.sum(exp_values)), 1e-8)
    return exp_values / denom


def _fallback_disease_name(crop_key: str, disease_score: float) -> str:
    default_name = DISEASE_LIBRARY.get(crop_key, DISEASE_LIBRARY["tomato"]).get("name", "Leaf Disease")

    if disease_score < 25.0:
        return "Healthy Leaf"

    return str(default_name)


def predict_disease(preprocessed: Dict, features: Dict, crop_key: str, weather_context: Optional[Dict] = None) -> Dict:
    safe_crop = sanitize_crop_type(crop_key)
    weather_risk = safe_float((weather_context or {}).get("riskScore"), 0.0)

    lesion_ratio = safe_float(features.get("lesionAreaRatio"), 0.0)
    spot_score = safe_float(features.get("spotClusterScore"), 0.0)
    yellow_ratio = safe_float(features.get("yellowAreaRatio"), 0.0)

    feature_disease_score = clamp(
        10.0
        + (lesion_ratio * 190.0 * 0.6)
        + (spot_score * 0.28)
        + (yellow_ratio * 100.0 * 0.08)
        + (weather_risk * 0.12),
        0.0,
        100.0,
    )

    model_meta = _load_model()
    labels = model_meta.get("labels") or _default_labels()
    model_loaded = bool(model_meta.get("loaded") and model_meta.get("net") is not None)

    model_disease_name = None
    model_confidence = None

    if model_loaded:
        try:
            tensor = preprocessed.get("_tensor")
            if tensor is not None:
                net = model_meta["net"]
                net.setInput(tensor.astype(np.float32))
                output = net.forward().reshape(-1)
                probabilities = _softmax(output)

                top_index = int(np.argmax(probabilities))
                label_index = top_index % max(len(labels), 1)

                model_disease_name = str(labels[label_index])
                model_confidence = float(probabilities[top_index] * 100.0)
        except Exception:
            model_disease_name = None
            model_confidence = None

    if model_confidence is None:
        final_confidence = clamp(
            (feature_disease_score * 0.72)
            + (safe_float(DISEASE_LIBRARY.get(safe_crop, {}).get("confidence"), 88.0) * 0.28),
            35.0,
            97.0,
        )
    else:
        final_confidence = clamp((model_confidence * 0.78) + (feature_disease_score * 0.22), 25.0, 99.0)

    disease_name = model_disease_name or _fallback_disease_name(safe_crop, feature_disease_score)

    severity_score = clamp((feature_disease_score * 0.74) + (weather_risk * 0.26), 0.0, 100.0)
    severity = score_to_severity(severity_score)

    base_curve = clamp((feature_disease_score * 0.5) + (final_confidence * 0.5), 5.0, 98.0)
    probability_curve = [
        clamp(base_curve * 0.42, 5.0, 98.0),
        clamp(base_curve * 0.58, 5.0, 98.0),
        clamp(base_curve * 0.74, 5.0, 98.0),
        clamp(base_curve * 0.86, 5.0, 98.0),
        clamp(base_curve * 0.94, 5.0, 98.0),
        clamp(base_curve, 5.0, 98.0),
    ]

    return {
        "disease_name": disease_name,
        "confidence_score": round(final_confidence, 1),
        "severity": severity,
        "severityScore": round(severity_score, 1),
        "probability_curve": [round(value, 2) for value in probability_curve],
        "engine": "cnn-onnx" if model_confidence is not None else "feature-rules",
        "modelLoaded": model_loaded and model_confidence is not None,
        "modelPath": model_meta.get("path"),
        "signalSummary": {
            "lesionAreaRatio": round(lesion_ratio, 4),
            "spotClusterScore": round(spot_score, 2),
            "yellowAreaRatio": round(yellow_ratio, 4),
            "weatherRisk": round(weather_risk, 1),
        },
    }
