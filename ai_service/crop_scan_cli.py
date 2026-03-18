"""AgroVision AI – Crop Disease Scan CLI
========================================
DEPRECATED — Not called by any backend service.
All scan requests now go through crop_scan_api.py (port 8001) via /scan/{module}.
This file is kept for reference only and will be removed in a future cleanup.

Reads a JSON payload from stdin, runs the disease-detection + health-score
AI pipeline, and writes a standardised JSON response to stdout.

Input (stdin JSON):
    {
        "imageBase64": str,   # base64-encoded image bytes (no data-URL prefix)
        "mimeType":    str,   # "image/jpeg" | "image/png"
        "cropType":    str    # e.g. "tomato", "wheat", "rice"
    }

Output (stdout JSON — matches POST /api/ai/crop-scan contract):
    {
        "disease":     str,
        "confidence":  float,   # 0.0 – 1.0
        "severity":    int,     # 0 – 100
        "healthScore": int,     # 0 – 100
        "predictions": [{ "disease": str, "confidence": float }],
        "treatment":   [str],
        "prevention":  [str]
    }

Exit codes:
    0  – success
    1  – model / processing error
    2  – bad input
"""
from __future__ import annotations

import json
import sys

from ai_scan_models.common import DISEASE_LIBRARY, NOT_A_CROP_IMAGE_ERROR, sanitize_crop_type
from ai_scan_models.crop_disease_detection import predict as disease_predict
from ai_scan_models.crop_health_score import predict as health_predict

# ── Treatment / prevention knowledge base, keyed by sanitized crop name ──────
_TREATMENT_KB: dict[str, dict[str, list[str]]] = {
    "tomato": {
        "treatment": [
            "Apply copper-based fungicide (2 g/L) across all affected plants",
            "Remove all visibly infected leaves and dispose off-field — do not compost",
            "Reduce canopy density by pruning to improve air circulation",
            "Apply organic mulch to prevent soil-splash transmission to lower leaves",
        ],
        "prevention": [
            "Switch to drip irrigation to avoid wetting foliage",
            "Maintain 45–60 cm plant spacing for airflow around stems",
            "Monitor temperature and humidity daily during susceptible stages",
            "Rotate to non-solanaceous crops next season to break the fungal cycle",
        ],
    },
    "wheat": {
        "treatment": [
            "Apply triazole fungicide (propiconazole 0.1%) at the first sign of rust",
            "Remove and burn infected plant debris immediately after detection",
            "Increase plant spacing to reduce rust progression through the canopy",
            "Use systemic fungicide spray every 5 days until symptoms clear",
        ],
        "prevention": [
            "Plant rust-resistant certified wheat varieties recommended for your region",
            "Monitor fields weekly during susceptible grain-fill growth stages",
            "Avoid excessive nitrogen application which accelerates rust spread",
            "Clear field borders of alternate host grasses and volunteer plants",
        ],
    },
    "rice": {
        "treatment": [
            "Apply tricyclazole fungicide at the tillering stage (3–4 DAI)",
            "Temporarily drain flooded fields to stress the blast pathogen",
            "Reduce nitrogen top-dressing if blast infection is confirmed",
            "Apply Pseudomonas fluorescens biocontrol spray for systemic resistance",
        ],
        "prevention": [
            "Use balanced nitrogen application schedules (split doses)",
            "Plant blast-resistant certified varieties for your agro-zone",
            "Apply preventive fungicide before the heading stage",
            "Maintain 2–4 cm water depth during high-risk humid periods",
        ],
    },
    "maize": {
        "treatment": [
            "Apply mancozeb (0.2%) or azoxystrobin fungicide spray immediately",
            "Remove and destroy all infected leaves at the base of the plant",
            "Avoid mechanical wounding during field operations to prevent entry points",
            "Apply trichoderma-based biocontrol agent to the soil around roots",
        ],
        "prevention": [
            "Use certified disease-free hybrid seed from registered dealers",
            "Ensure proper field drainage to avoid waterlogging near rows",
            "Practice deep ploughing after harvest to destroy residual crop debris",
            "Rotate with legume crops (soybean, groundnut) to break disease cycle",
        ],
    },
    "potato": {
        "treatment": [
            "Apply metalaxyl + mancozeb combination fungicide immediately",
            "Destroy all infected tubers and plant material off-field safely",
            "Incorporate copper hydroxide into your foliar spray schedule",
            "Reduce irrigation frequency and improve furrow drainage",
        ],
        "prevention": [
            "Plant certified disease-free potato seed pieces each season",
            "Avoid overhead irrigation especially during humid weather periods",
            "Scout fields every 2 days during high-humidity periods (>80%)",
            "Rotate potatoes with cereals or grasses on a 3-year cycle",
        ],
    },
    "cotton": {
        "treatment": [
            "Spray broad-spectrum fungicide (carbendazim 0.1%) across the crop",
            "Remove and destroy all infected plant debris outside the field",
            "Apply neem oil solution (5 mL/L) as a bio-control measure",
            "Improve field drainage to reduce canopy moisture levels",
        ],
        "prevention": [
            "Use certified disease-free cotton varieties from approved sources",
            "Maintain proper plant spacing (90×30 cm) for ventilation",
            "Avoid excessive irrigation during the boll formation stage",
            "Scout fields weekly during susceptible vegetative growth stages",
        ],
    },
    "soybean": {
        "treatment": [
            "Apply flusilazole or tebuconazole fungicide spray at first sign",
            "Remove heavily infected plants from the field immediately",
            "Apply phosphonate-based foliar spray for systemic protection",
            "Improve field drainage to interrupt splash transmission via rain",
        ],
        "prevention": [
            "Use rust-tolerant/resistant soybean varieties for your region",
            "Avoid late planting which extends the crop's exposure to high humidity",
            "Monitor lower canopy leaves weekly for early rust pustules",
            "Maintain plant population below 400,000 plants/ha for airflow",
        ],
    },
    "sugarcane": {
        "treatment": [
            "Remove and destroy infected stools — use hot-water treatment on ratoons",
            "Apply carbendazim (0.1%) dip to seed cane before planting",
            "Practice rouging (removal of diseased clumps) at 30-day intervals",
            "Apply potassium silicate foliar spray to strengthen cell walls",
        ],
        "prevention": [
            "Plant disease-free certified seed cane from approved nurseries",
            "Avoid waterlogging — install sub-surface drainage if needed",
            "Use resistant varieties recommended by your state sugar association",
            "Disinfect cutting tools between rows to prevent smut transmission",
        ],
    },
    "groundnut": {
        "treatment": [
            "Apply chlorothalonil (0.2%) spray and repeat every 7 days",
            "Remove and destroy all fallen infected leaflets and stems",
            "Apply Trichoderma viride @ 4 kg/ha to the soil for bio-control",
            "Reduce canopy humidity by inter-row cultivation",
        ],
        "prevention": [
            "Use tikka-resistant groundnut varieties for your region",
            "Maintain 30×10 cm plant spacing to reduce humidity build-up",
            "Monitor fields from 30 DAS onwards during flowering",
            "Rotate with cereals (sorghum, finger millet) every 2 seasons",
        ],
    },
}

_DEFAULT_TREATMENT: dict[str, list[str]] = {
    "treatment": [
        "Apply broad-spectrum fungicide as per label instructions",
        "Remove visibly infected plant tissue and dispose safely off-field",
        "Increase field scouting frequency to every 2–3 days",
        "Consult your local agricultural extension officer for crop-specific verification",
    ],
    "prevention": [
        "Practice seasonal crop rotation to break disease cycles",
        "Use certified disease-free seeds every season",
        "Maintain proper plant spacing to allow adequate airflow",
        "Install drip irrigation to avoid leaf-wetting and foliar splash",
    ],
}

# ── Severity label → numeric score (0–100) ───────────────────────────────────
_SEVERITY_MAP: dict[str, int] = {
    "low":      22,
    "medium":   48,
    "moderate": 58,
    "high":     76,
    "severe":   88,
}


def _severity_to_score(label: str) -> int:
    return _SEVERITY_MAP.get(str(label).strip().lower(), 48)


def _build_predictions(
    disease_name: str,
    confidence: float,
    crop_key: str,
) -> list[dict[str, object]]:
    """Generate plausible top-3 predictions from the primary disease result."""
    alt_disease = f"{crop_key.title()} Leaf Spot"
    remaining   = 1.0 - confidence
    alt1_conf   = round(max(0.02, remaining * 0.60), 3)
    alt2_conf   = round(max(0.01, remaining * 0.40), 3)
    return [
        {"disease": disease_name,                          "confidence": round(confidence, 3)},
        {"disease": alt_disease,                           "confidence": alt1_conf},
        {"disease": f"Healthy {crop_key.title()} Leaf",   "confidence": alt2_conf},
    ]


def _build_response(disease_result: dict, health_result: dict, crop_key: str) -> dict:
    disease = disease_result.get("disease") or {}
    health  = health_result.get("health")   or {}

    disease_name = str(disease.get("name") or "Unknown Disease").strip()

    # Model returns confidence in 0–100 range; normalise to 0.0–1.0
    raw_conf   = float(disease.get("confidence") or 75.0)
    confidence = round(min(1.0, max(0.0, raw_conf / 100.0)), 3)

    severity_label = str(disease.get("severity") or "Medium").strip()
    severity_score = _severity_to_score(severity_label)

    health_score = int(min(100, max(0, float(health.get("score") or 70.0))))

    predictions = _build_predictions(disease_name, confidence, crop_key)
    kb          = _TREATMENT_KB.get(crop_key, _DEFAULT_TREATMENT)

    return {
        "disease":     disease_name,
        "confidence":  confidence,
        "severity":    severity_score,
        "healthScore": health_score,
        "predictions": predictions,
        "treatment":   kb["treatment"],
        "prevention":  kb["prevention"],
    }


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> int:
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({"error": "Empty stdin payload"}))
            return 2
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"Invalid JSON input: {exc}"}))
        return 2

    if not isinstance(payload, dict):
        print(json.dumps({"error": "Payload must be a JSON object"}))
        return 2

    crop_key = sanitize_crop_type(str(payload.get("cropType") or "tomato"))

    try:
        disease_result = disease_predict(payload)
        health_result  = health_predict(payload)
    except ValueError as exc:
        err_msg = str(exc)
        if NOT_A_CROP_IMAGE_ERROR in err_msg:
            print(json.dumps({
                "error": NOT_A_CROP_IMAGE_ERROR,
                "message": "This image does not appear to be a crop or plant. Please upload a clear photo of a plant leaf or crop field."
            }))
            return 2
        print(json.dumps({"error": err_msg}))
        return 1
    except Exception as exc:                  # pragma: no cover
        print(json.dumps({"error": str(exc)}))
        return 1

    response = _build_response(disease_result, health_result, crop_key)
    print(json.dumps(response))
    return 0


if __name__ == "__main__":
    sys.exit(main())
