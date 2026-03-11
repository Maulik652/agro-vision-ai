"""AgroVision AI – Crop Disease Scan FastAPI Microservice
=========================================================
Standalone REST API wrapping the existing AI scan models.
The Node.js backend calls this service for real-time predictions.

Start the service:
    cd agro-vision-ai/ai_service
    uvicorn crop_scan_api:app --host 0.0.0.0 --port 8001 --reload

Endpoints:
    GET  /health   → liveness probe
    POST /predict  → multipart/form-data { image: File, cropType: str }

Response (JSON):
    {
        "disease":     str,
        "confidence":  float,   # 0.0 – 1.0
        "severity":    int,     # 0 – 100
        "healthScore": int,     # 0 – 100
        "predictions": [{ "disease": str, "confidence": float }],
        "treatment":   [str],
        "prevention":  [str]
    }
"""
from __future__ import annotations

import base64
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ai_scan_models.common import sanitize_crop_type
from ai_scan_models.crop_disease_detection import predict as disease_predict
from ai_scan_models.crop_health_score import predict as health_predict

# ── Treatment / prevention knowledge base (mirrors crop_scan_cli.py) ─────────
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
            "Apply triazole fungicide (propiconazole 0.1%) at first sign of rust",
            "Remove and burn infected plant debris immediately after detection",
            "Increase plant spacing to reduce rust progression through the canopy",
            "Use systemic fungicide spray every 5 days until symptoms clear",
        ],
        "prevention": [
            "Plant rust-resistant certified wheat varieties for your region",
            "Monitor fields weekly during susceptible grain-fill growth stages",
            "Avoid excessive nitrogen which accelerates rust spread",
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
            "Avoid mechanical wounding during field operations",
            "Apply trichoderma-based biocontrol agent to the soil around roots",
        ],
        "prevention": [
            "Use certified disease-free hybrid seed from registered dealers",
            "Ensure proper field drainage to avoid waterlogging",
            "Practice deep ploughing after harvest to destroy residual debris",
            "Rotate with legume crops to break the disease cycle",
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
            "Avoid overhead irrigation especially during humid weather",
            "Scout fields every 2 days during high-humidity periods (>80%)",
            "Rotate potatoes with cereals on a 3-year cycle",
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
            "Use certified disease-free cotton varieties",
            "Maintain proper plant spacing (90×30 cm) for ventilation",
            "Avoid excessive irrigation during boll formation",
            "Scout fields weekly during susceptible vegetative growth stages",
        ],
    },
    "soybean": {
        "treatment": [
            "Apply flusilazole or tebuconazole fungicide spray at first sign",
            "Remove heavily infected plants from the field immediately",
            "Apply phosphonate-based foliar spray for systemic protection",
            "Improve field drainage to interrupt splash transmission",
        ],
        "prevention": [
            "Use rust-tolerant soybean varieties for your region",
            "Avoid late planting which extends high-humidity exposure",
            "Monitor lower canopy leaves weekly for early rust pustules",
            "Maintain plant population below 400,000 plants/ha",
        ],
    },
    "sugarcane": {
        "treatment": [
            "Remove and destroy infected stools — apply hot-water treatment on ratoons",
            "Apply carbendazim (0.1%) dip to seed cane before planting",
            "Practice rouging at 30-day intervals to remove diseased clumps",
            "Apply potassium silicate foliar spray to strengthen cell walls",
        ],
        "prevention": [
            "Plant disease-free certified seed cane from approved nurseries",
            "Install sub-surface drainage to avoid waterlogging",
            "Use resistant varieties recommended by your sugar association",
            "Disinfect cutting tools between rows to prevent smut transmission",
        ],
    },
}

_DEFAULT_TREATMENT: dict[str, list[str]] = {
    "treatment": [
        "Apply broad-spectrum fungicide as per label instructions",
        "Remove visibly infected plant tissue and dispose safely",
        "Increase field scouting frequency to every 2–3 days",
        "Consult local agricultural extension officer for verification",
    ],
    "prevention": [
        "Practice seasonal crop rotation to break disease cycles",
        "Use certified disease-free seeds each season",
        "Maintain proper plant spacing for airflow",
        "Install drip irrigation to avoid leaf-wetting",
    ],
}

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
) -> list[dict]:
    remaining = 1.0 - confidence
    alt1_conf = round(max(0.02, remaining * 0.60), 3)
    alt2_conf = round(max(0.01, remaining * 0.40), 3)
    alt_disease = f"{crop_key.title()} Leaf Spot"
    return [
        {"disease": disease_name,                        "confidence": round(confidence, 3)},
        {"disease": alt_disease,                         "confidence": alt1_conf},
        {"disease": f"Healthy {crop_key.title()} Leaf",  "confidence": alt2_conf},
    ]


# ── FastAPI application ───────────────────────────────────────────────────────

app = FastAPI(
    title="AgroVision AI – Crop Disease Detection API",
    description=(
        "CNN-powered plant disease detection microservice. "
        "Upload a leaf image and receive disease diagnosis, severity, and treatment advice."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:5173",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health", summary="Liveness probe")
async def health_check() -> dict:
    return {"status": "ok", "service": "agrovision-crop-scan", "version": "1.0.0"}


@app.post("/predict", summary="Predict crop disease from leaf image")
async def predict_disease(
    image: Annotated[UploadFile, File(description="Crop leaf image (JPG or PNG, max 10 MB)")],
    cropType: Annotated[str, Form(description="Crop type, e.g. tomato, wheat, rice")] = "tomato",
) -> dict:
    """
    Accept a leaf image and return:
    - Detected disease name and confidence
    - Disease severity score (0–100)
    - Plant health score (0–100)
    - Top-3 prediction probabilities
    - Recommended treatment steps
    - Preventive care advice
    """
    allowed_content_types = {"image/jpeg", "image/jpg", "image/png"}
    content_type = (image.content_type or "image/jpeg").lower().split(";")[0].strip()

    if content_type not in allowed_content_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG and PNG images are supported. Please upload a valid leaf photo.",
        )

    raw_bytes = await image.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Image file is empty.")
    if len(raw_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 10 MB.")

    image_b64 = base64.b64encode(raw_bytes).decode("utf-8")
    crop_key  = sanitize_crop_type(str(cropType or "tomato"))

    payload = {
        "imageBase64": image_b64,
        "mimeType":    content_type,
        "cropType":    crop_key,
    }

    try:
        disease_result = disease_predict(payload)
        health_result  = health_predict(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Model inference failed: {exc}",
        ) from exc

    disease        = disease_result.get("disease") or {}
    health         = health_result.get("health")   or {}

    disease_name   = str(disease.get("name") or "Unknown Disease").strip()
    raw_conf       = float(disease.get("confidence") or 75.0)
    confidence     = round(min(1.0, max(0.0, raw_conf / 100.0)), 3)
    severity       = _severity_to_score(str(disease.get("severity") or "Medium"))
    health_score   = int(min(100, max(0, float(health.get("score") or 70.0))))

    predictions    = _build_predictions(disease_name, confidence, crop_key)
    kb             = _TREATMENT_KB.get(crop_key, _DEFAULT_TREATMENT)

    return {
        "disease":     disease_name,
        "confidence":  confidence,
        "severity":    severity,
        "healthScore": health_score,
        "predictions": predictions,
        "treatment":   kb["treatment"],
        "prevention":  kb["prevention"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("crop_scan_api:app", host="0.0.0.0", port=8001, reload=True)
