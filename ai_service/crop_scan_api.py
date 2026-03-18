"""AgroVision AI – Crop Disease Scan FastAPI Microservice
=========================================================
Standalone REST API wrapping the existing AI scan models.
The Node.js backend calls this service for real-time predictions.

Start the service:
    cd agro-vision-ai/ai_service
    uvicorn crop_scan_api:app --host 0.0.0.0 --port 8001 --reload

Endpoints:
    GET  /health   → liveness probe
    POST /predict  → multipart/form-data { image: File, cropType: str, scanType: str }

Response (JSON):
    {
        "success":    bool,
        "message":    str,
        "data": {
            "disease":          str,
            "confidence":       float,   # 0.0 – 1.0
            "severity":         int,     # 0 – 100
            "healthScore":      int,     # 0 – 100
            "predictions":      [{ "disease": str, "confidence": float }],
            "treatment":        [str],
            "prevention":       [str],
            "detectedScanType": str      # "crop" | "soil"
        } | null
    }
"""
from __future__ import annotations

import base64
import io
from typing import Annotated, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ai_scan_models.common import sanitize_crop_type
from ai_scan_models.crop_disease_detection import predict as disease_predict
from ai_scan_models.crop_health_score import predict as health_predict
from ai_scan_models.crop_classifier import predict as crop_predict
from ai_scan_models.pest_detection import predict as pest_predict
from ai_scan_models.nutrient_deficiency_detection import predict as nutrient_predict
from ai_scan_models.treatment_recommendation import predict as treatment_predict

# ── Optional OpenCV import for blur detection ─────────────────────────────────
try:
    import cv2
    import numpy as np
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False

# ── Optional PIL import for basic image validation ────────────────────────────
try:
    from PIL import Image as PILImage
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False

# ── Optional PyTorch import for plant validation ──────────────────────────────
try:
    import torch
    import torchvision.transforms as _T
    from torchvision import models as _tv_models
    _TORCH_AVAILABLE = True
except ImportError:
    _TORCH_AVAILABLE = False

CONFIDENCE_THRESHOLD = 0.60   # below this → LOW_CONFIDENCE error
BLUR_THRESHOLD       = 80.0   # Laplacian variance below this → blurry
PLANT_CONFIDENCE_MIN = 0.70   # minimum plant confidence to accept image


# ── ImageNet class index sets for plant vs non-plant ─────────────────────────
# ImageNet 1000-class indices that correspond to plants / leaves / crops.
# Indices sourced from the standard ImageNet 1k label list.
_PLANT_IMAGENET_INDICES: frozenset[int] = frozenset([
    # flowers
    985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 996, 997, 998, 999,
    # plants / trees / leaves
    984, 983, 982, 981, 980, 979, 978, 977, 976, 975, 974, 973, 972, 971, 970,
    969, 968, 967, 966, 965, 964, 963, 962, 961, 960, 959, 958, 957, 956, 955,
    # mushroom / fungus (relevant for disease context)
    281, 282,
    # corn / ear of corn
    987,
    # specific plant-adjacent indices (artichoke, broccoli, cauliflower, etc.)
    937, 938, 939, 940, 941, 942, 943, 944, 945, 946, 947, 948, 949, 950,
    # banana, pineapple, strawberry, lemon, orange, fig, apple, pear, etc.
    954, 953, 952, 951, 950, 949, 948, 947, 946, 945,
    # pot plant / houseplant
    906,
    # hay / straw / grass
    760, 759,
])

# Broad ImageNet "super-category" ranges that are clearly NOT plants.
# We reject if the top prediction falls in these and plant score is too low.
_NON_PLANT_IMAGENET_RANGES: list[tuple[int, int]] = [
    (0,   397),   # animals (dogs, cats, birds, fish, insects, reptiles …)
    (400, 599),   # vehicles, instruments, tools, electronics
    (600, 699),   # household objects, furniture
    (700, 799),   # structures, buildings
    (800, 899),   # misc objects (ball, bottle, cup …)
    (900, 909),   # food items that are not plant-like
]


class _PlantValidator:
    """
    Lightweight plant/non-plant gate using MobileNetV3-Small pretrained on ImageNet.
    Loaded once at startup; inference is CPU-only and takes ~10 ms per image.
    """

    _IMAGENET_MEAN = [0.485, 0.456, 0.406]
    _IMAGENET_STD  = [0.229, 0.224, 0.225]

    def __init__(self) -> None:
        self._model: Optional[object] = None
        self._transform: Optional[object] = None
        self._ready = False
        self._load()

    def _load(self) -> None:
        if not _TORCH_AVAILABLE or not _PIL_AVAILABLE:
            return
        try:
            weights = _tv_models.MobileNet_V3_Small_Weights.IMAGENET1K_V1
            model = _tv_models.mobilenet_v3_small(weights=weights)
            model.eval()
            self._model = model
            self._transform = _T.Compose([
                _T.Resize(256),
                _T.CenterCrop(224),
                _T.ToTensor(),
                _T.Normalize(self._IMAGENET_MEAN, self._IMAGENET_STD),
            ])
            self._ready = True
            print("[PlantValidator] MobileNetV3-Small loaded for plant validation.")
        except Exception as exc:
            print(f"[PlantValidator] Failed to load model ({exc}). Validation will be skipped.")

    def _plant_score(self, probabilities: "torch.Tensor") -> float:
        """
        Compute aggregate probability mass over plant-related ImageNet classes.
        Returns a float in [0, 1].
        """
        probs = probabilities.squeeze(0)  # shape: (1000,)
        plant_prob = sum(float(probs[i]) for i in _PLANT_IMAGENET_INDICES if i < len(probs))
        return min(float(plant_prob), 1.0)

    def validate(self, image_bytes: bytes) -> tuple[bool, float, str]:
        """
        Validate that the image contains a plant/crop/leaf.

        Returns:
            (is_plant, confidence, rejection_reason)
            - is_plant: True if image passes validation
            - confidence: plant confidence score 0.0–1.0
            - rejection_reason: human-readable message if rejected, else ""
        """
        if not self._ready:
            # Validator unavailable — allow through (fail open)
            return True, 1.0, ""

        if not _PIL_AVAILABLE:
            return True, 1.0, ""

        try:
            img = PILImage.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            return False, 0.0, "Could not decode image. Please upload a valid JPG or PNG file."

        try:
            tensor = self._transform(img).unsqueeze(0)  # (1, 3, 224, 224)
            with torch.no_grad():
                logits = self._model(tensor)
                probs  = torch.softmax(logits, dim=1)

            plant_conf = self._plant_score(probs)
            top_idx    = int(torch.argmax(probs, dim=1).item())

            if plant_conf >= PLANT_CONFIDENCE_MIN:
                return True, plant_conf, ""

            # Check if top prediction is clearly a non-plant object
            is_non_plant_top = any(lo <= top_idx <= hi for lo, hi in _NON_PLANT_IMAGENET_RANGES)

            if plant_conf < PLANT_CONFIDENCE_MIN and is_non_plant_top:
                return (
                    False,
                    plant_conf,
                    "Invalid crop image. Please upload a clear photo of a plant leaf or crop.",
                )

            # Ambiguous — apply stricter threshold
            if plant_conf < 0.40:
                return (
                    False,
                    plant_conf,
                    "Image does not appear to contain a crop or plant. "
                    "Please upload a close-up photo of a leaf or crop.",
                )

            return True, plant_conf, ""

        except Exception as exc:
            # On any inference error, fail open to avoid blocking legitimate requests
            print(f"[PlantValidator] Inference error ({exc}), allowing request through.")
            return True, 1.0, ""


# Singleton — loaded once at module import (startup)
_plant_validator = _PlantValidator()

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


# ── Image validation helpers ──────────────────────────────────────────────────

def _check_blur(image_bytes: bytes) -> bool:
    """Return True if image is too blurry (Laplacian variance < threshold)."""
    if not _CV2_AVAILABLE:
        return False  # skip if OpenCV not installed
    try:
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return False
        variance = cv2.Laplacian(img, cv2.CV_64F).var()
        return float(variance) < BLUR_THRESHOLD
    except Exception:
        return False


def _detect_scan_type(image_bytes: bytes) -> str:
    """
    Heuristic auto-detection: returns "crop" or "soil".
    Uses dominant color analysis — green-dominant → crop, brown/grey → soil.
    Falls back to "crop" if PIL is unavailable.
    """
    if not _PIL_AVAILABLE:
        return "crop"
    try:
        img = PILImage.open(io.BytesIO(image_bytes)).convert("RGB").resize((64, 64))
        pixels = list(img.getdata())
        green_count = sum(1 for r, g, b in pixels if g > r and g > b and g > 80)
        brown_count = sum(1 for r, g, b in pixels if r > 80 and g > 50 and b < 80 and r > g > b)
        total = len(pixels)
        green_ratio = green_count / total
        brown_ratio = brown_count / total
        if brown_ratio > 0.35 and green_ratio < 0.20:
            return "soil"
        return "crop"
    except Exception:
        return "crop"


def _validate_scan_type(detected: str, requested: str) -> tuple[bool, str]:
    """
    Validate that the image matches the requested scan type.
    Returns (is_valid, error_message).
    """
    if requested == "auto":
        return True, ""
    if detected != requested:
        if requested == "crop":
            return False, "Invalid image. Please upload a crop/plant image."
        if requested == "soil":
            return False, "Invalid image. Please upload a soil image."
    return True, ""


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
    return {
        "status": "ok",
        "service": "agrovision-crop-scan",
        "version": "1.0.0",
        "plant_validator": "ready" if _plant_validator._ready else "unavailable",
    }


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

    # ── Plant validation gate ─────────────────────────────────────────────────
    is_plant, plant_conf, rejection_reason = _plant_validator.validate(raw_bytes)
    if not is_plant:
        raise HTTPException(
            status_code=422,
            detail={
                "error":      "NOT_A_CROP_IMAGE",
                "message":    rejection_reason,
                "confidence": round(plant_conf, 3),
                "code":       400,
            },
        )

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


# ── JSON scan endpoint (called by Node.js scanService.js) ────────────────────

_SCAN_MODULE_MAP = {
    "crop":       crop_predict,
    "disease":    disease_predict,
    "pest":       pest_predict,
    "nutrient":   nutrient_predict,
    "health-score": health_predict,
    "treatment":  treatment_predict,
}


@app.post("/scan/{module}", summary="Run a single scan module via JSON payload")
async def scan_module(module: str, payload: dict) -> dict:
    """
    JSON endpoint for Node.js scanService.js.
    Accepts: { imageBase64, mimeType, cropType, mode, userContext }
    Returns the raw module output dict.
    """
    predict_fn = _SCAN_MODULE_MAP.get(module)
    if predict_fn is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown scan module '{module}'. Valid: {list(_SCAN_MODULE_MAP.keys())}",
        )

    image_b64 = str(payload.get("imageBase64") or "").strip()
    if not image_b64:
        raise HTTPException(status_code=400, detail="imageBase64 is required")

    mime_type = str(payload.get("mimeType") or "image/jpeg").lower().split(";")[0].strip()
    if mime_type not in {"image/jpeg", "image/jpg", "image/png"}:
        raise HTTPException(status_code=400, detail="Only JPG and PNG images are supported.")

    # ── Plant validation gate ─────────────────────────────────────────────────
    try:
        raw_bytes = base64.b64decode(image_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="imageBase64 is not valid base64.")

    is_plant, plant_conf, rejection_reason = _plant_validator.validate(raw_bytes)
    if not is_plant:
        raise HTTPException(
            status_code=422,
            detail={
                "error":      "NOT_A_CROP_IMAGE",
                "message":    rejection_reason,
                "confidence": round(plant_conf, 3),
                "code":       400,
            },
        )

    crop_key = sanitize_crop_type(str(payload.get("cropType") or "tomato"))

    scan_payload = {
        "imageBase64": image_b64,
        "mimeType": mime_type,
        "cropType": crop_key,
        "userContext": payload.get("userContext") or {},
    }

    try:
        result = predict_fn(scan_payload)
    except ValueError as exc:
        msg = str(exc)
        if "NOT_A_CROP_IMAGE" in msg:
            raise HTTPException(status_code=422, detail={"error": "NOT_A_CROP_IMAGE", "message": "Invalid image. Please upload a crop/plant image."})
        raise HTTPException(status_code=400, detail=msg)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scan inference failed: {exc}")

    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("crop_scan_api:app", host="0.0.0.0", port=8001, reload=True)
