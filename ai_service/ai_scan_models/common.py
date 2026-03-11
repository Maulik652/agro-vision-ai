import base64
import io
import math
from typing import Dict, List, Optional

import numpy as np
from PIL import Image, ImageFilter, UnidentifiedImageError

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - environment fallback
    cv2 = None


SUPPORTED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png"}


DISEASE_LIBRARY = {
    "tomato": {
        "name": "Leaf Blight",
        "severity": "Medium",
        "confidence": 93,
        "probability": [28, 42, 58, 74, 87, 93],
        "recommendation": "Apply fungicide spray within 3 days.",
        "explanation": "The leaf pattern indicates early symptoms of leaf blight disease."
    },
    "rice": {
        "name": "Bacterial Leaf Streak",
        "severity": "Low",
        "confidence": 89,
        "probability": [21, 34, 47, 63, 78, 89],
        "recommendation": "Use copper-based spray and improve drainage.",
        "explanation": "Linear lesions on leaf surface suggest bacterial streak pressure."
    },
    "wheat": {
        "name": "Rust Spot",
        "severity": "Medium",
        "confidence": 90,
        "probability": [19, 31, 45, 62, 80, 90],
        "recommendation": "Apply triazole fungicide and monitor every 2 days.",
        "explanation": "Orange-brown pustules indicate likely rust development stage."
    },
    "cotton": {
        "name": "Alternaria Leaf Spot",
        "severity": "Moderate",
        "confidence": 91,
        "probability": [24, 36, 49, 64, 79, 91],
        "recommendation": "Spray broad-spectrum fungicide and reduce canopy humidity.",
        "explanation": "Concentric dark lesions indicate probable alternaria infection."
    },
    "maize": {
        "name": "Northern Leaf Blight",
        "severity": "Medium",
        "confidence": 90,
        "probability": [23, 35, 50, 66, 81, 90],
        "recommendation": "Apply recommended fungicide and remove affected leaves.",
        "explanation": "Elongated gray lesions are consistent with maize blight pattern."
    },
    "soybean": {
        "name": "Soybean Rust",
        "severity": "Low",
        "confidence": 88,
        "probability": [18, 29, 43, 60, 75, 88],
        "recommendation": "Use preventive fungicide and maintain airflow.",
        "explanation": "Small pustules beneath leaves indicate early soybean rust risk."
    },
    "groundnut": {
        "name": "Tikka Leaf Spot",
        "severity": "Moderate",
        "confidence": 90,
        "probability": [20, 32, 48, 65, 79, 90],
        "recommendation": "Apply chlorothalonil spray and monitor spread weekly.",
        "explanation": "Circular dark spots on leaflets indicate likely tikka disease."
    }
}


PEST_LIBRARY = {
    "tomato": {
        "name": "Aphids",
        "damage": "Low",
        "risk": "Medium",
        "confidence": 90,
        "recommendation": "Apply neem oil spray to prevent spread.",
        "explanation": "Small clusters on leaves indicate aphid infestation."
    },
    "rice": {
        "name": "Brown Planthopper",
        "damage": "Moderate",
        "risk": "High",
        "confidence": 92,
        "recommendation": "Deploy light traps and targeted pesticide rotation.",
        "explanation": "Stem base feeding pattern suggests hopper pressure."
    },
    "wheat": {
        "name": "Armyworm",
        "damage": "Low",
        "risk": "Medium",
        "confidence": 88,
        "recommendation": "Use bio-pesticide spray and evening scouting.",
        "explanation": "Leaf-edge chewing and frass spots indicate early armyworm activity."
    },
    "cotton": {
        "name": "Bollworm",
        "damage": "Moderate",
        "risk": "High",
        "confidence": 91,
        "recommendation": "Apply pheromone trap program and targeted spray.",
        "explanation": "Entry holes and boll feeding signs indicate bollworm presence."
    },
    "maize": {
        "name": "Fall Armyworm",
        "damage": "High",
        "risk": "High",
        "confidence": 93,
        "recommendation": "Apply rapid control treatment and isolate hotspot rows.",
        "explanation": "Whorl damage pattern indicates active fall armyworm attack."
    },
    "soybean": {
        "name": "Stem Fly",
        "damage": "Low",
        "risk": "Medium",
        "confidence": 87,
        "recommendation": "Use seed treatment for next cycle and monitor plants.",
        "explanation": "Stem tunneling signs indicate likely stem fly stress."
    },
    "groundnut": {
        "name": "Leaf Miner",
        "damage": "Moderate",
        "risk": "Medium",
        "confidence": 89,
        "recommendation": "Use selective insecticide and remove heavily affected leaves.",
        "explanation": "Blotch mines on leaves indicate leaf miner damage."
    }
}


NUTRIENT_LIBRARY = {
    "tomato": {
        "nutrient": "Nitrogen Deficiency",
        "severity": "Moderate",
        "confidence": 88,
        "recommendation": "Apply nitrogen-rich fertilizer in split doses.",
        "explanation": "Yellow leaf patterns suggest nitrogen deficiency."
    },
    "rice": {
        "nutrient": "Zinc Deficiency",
        "severity": "Low",
        "confidence": 84,
        "recommendation": "Apply zinc sulfate spray within 5 days.",
        "explanation": "Interveinal chlorosis indicates probable zinc deficiency."
    },
    "wheat": {
        "nutrient": "Nitrogen Deficiency",
        "severity": "Low",
        "confidence": 82,
        "recommendation": "Top dress nitrogen and maintain moisture.",
        "explanation": "Pale foliage and slowed growth indicate low nitrogen availability."
    },
    "cotton": {
        "nutrient": "Potassium Deficiency",
        "severity": "Moderate",
        "confidence": 86,
        "recommendation": "Apply potassium sulfate through fertigation.",
        "explanation": "Leaf edge scorching suggests potassium stress."
    },
    "maize": {
        "nutrient": "Nitrogen Deficiency",
        "severity": "Moderate",
        "confidence": 87,
        "recommendation": "Apply urea in two splits and check soil moisture.",
        "explanation": "V-shaped yellowing on lower leaves indicates nitrogen deficiency."
    },
    "soybean": {
        "nutrient": "Phosphorus Deficiency",
        "severity": "Low",
        "confidence": 83,
        "recommendation": "Apply phosphorus-rich fertilizer and inoculant support.",
        "explanation": "Dark-green to purplish tint indicates phosphorus stress."
    },
    "groundnut": {
        "nutrient": "Calcium Deficiency",
        "severity": "Moderate",
        "confidence": 85,
        "recommendation": "Apply gypsum near pegging stage.",
        "explanation": "Poor pod fill pattern indicates possible calcium deficiency."
    }
}


CROP_SIGNATURE_LIBRARY = {
    "tomato": {
        "texture": 70,
        "colorVariance": 63,
        "spotPattern": 58,
        "edgeComplexity": 56,
        "moistureSignature": 69,
        "greenLeafRatio": 0.63,
        "yellowAreaRatio": 0.12,
    },
    "rice": {
        "texture": 58,
        "colorVariance": 52,
        "spotPattern": 44,
        "edgeComplexity": 46,
        "moistureSignature": 82,
        "greenLeafRatio": 0.75,
        "yellowAreaRatio": 0.08,
    },
    "wheat": {
        "texture": 55,
        "colorVariance": 47,
        "spotPattern": 41,
        "edgeComplexity": 48,
        "moistureSignature": 50,
        "greenLeafRatio": 0.57,
        "yellowAreaRatio": 0.14,
    },
    "cotton": {
        "texture": 64,
        "colorVariance": 58,
        "spotPattern": 52,
        "edgeComplexity": 62,
        "moistureSignature": 56,
        "greenLeafRatio": 0.6,
        "yellowAreaRatio": 0.1,
    },
    "maize": {
        "texture": 60,
        "colorVariance": 54,
        "spotPattern": 46,
        "edgeComplexity": 53,
        "moistureSignature": 60,
        "greenLeafRatio": 0.67,
        "yellowAreaRatio": 0.09,
    },
    "soybean": {
        "texture": 61,
        "colorVariance": 56,
        "spotPattern": 48,
        "edgeComplexity": 51,
        "moistureSignature": 59,
        "greenLeafRatio": 0.64,
        "yellowAreaRatio": 0.11,
    },
    "groundnut": {
        "texture": 57,
        "colorVariance": 50,
        "spotPattern": 50,
        "edgeComplexity": 55,
        "moistureSignature": 53,
        "greenLeafRatio": 0.59,
        "yellowAreaRatio": 0.13,
    }
}


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def safe_float(value, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return float(default)

    if math.isnan(parsed) or math.isinf(parsed):
        return float(default)

    return float(parsed)


def _strip_data_url(image_base64: str) -> str:
    text = str(image_base64 or "").strip()

    if text.startswith("data:") and "," in text:
        return text.split(",", 1)[1]

    return text


def _decode_image_bytes(image_base64: str) -> bytes:
    payload = _strip_data_url(image_base64)

    if not payload:
        raise ValueError("imageBase64 is required")

    # Base64 payloads can come without strict padding.
    padding = (-len(payload)) % 4
    payload += "=" * padding

    try:
        return base64.b64decode(payload, validate=False)
    except Exception as error:  # pragma: no cover - defensive
        raise ValueError("imageBase64 is not valid base64") from error


def sanitize_crop_type(value: str) -> str:
    key = (value or "tomato").strip().lower()

    if key in DISEASE_LIBRARY:
        return key

    return "tomato"


def validate_payload(payload: Dict) -> None:
    if not isinstance(payload, dict):
        raise ValueError("Payload must be a JSON object")

    image_base64 = str(payload.get("imageBase64") or "").strip()
    mime_type = str(payload.get("mimeType") or "").strip().lower()

    if not image_base64:
        raise ValueError("imageBase64 is required")

    if mime_type and mime_type not in SUPPORTED_MIME_TYPES:
        raise ValueError("Unsupported image format. Use JPG or PNG")

    image_bytes = _decode_image_bytes(image_base64)
    if len(image_bytes) < 256:
        raise ValueError("imageBase64 payload is too small for reliable analysis")


def crop_display_name(crop_key: str) -> str:
    return str(crop_key or "unknown").replace("_", " ").strip().title() or "Unknown"


def image_size_factor(image_base64: str) -> float:
    try:
        image_bytes = _decode_image_bytes(image_base64)
        normalized_length = len(image_bytes) / 220000.0
    except Exception:
        normalized_length = len(str(image_base64 or "")) / 300000.0

    return round(clamp(normalized_length, 0.35, 1.0), 3)


def _to_hsv(rgb_image: np.ndarray) -> np.ndarray:
    if cv2 is not None:
        return cv2.cvtColor(rgb_image, cv2.COLOR_RGB2HSV)

    pil_hsv = Image.fromarray(rgb_image).convert("HSV")
    hsv = np.array(pil_hsv, dtype=np.uint8)
    # Match OpenCV-ish hue scale (0-179).
    hsv[..., 0] = (hsv[..., 0].astype(np.float32) * (179.0 / 255.0)).astype(np.uint8)
    return hsv


def _safe_image_open(image_bytes: bytes) -> Image.Image:
    try:
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except UnidentifiedImageError as error:
        raise ValueError("Unable to decode image. Ensure imageBase64 is a valid JPG/PNG.") from error


def preprocess_image(image_base64: str, mime_type: str = "image/jpeg") -> Dict:
    image_bytes = _decode_image_bytes(image_base64)
    image = _safe_image_open(image_bytes)

    rgb = np.array(image, dtype=np.uint8)
    original_h, original_w = int(rgb.shape[0]), int(rgb.shape[1])

    # Step 1: denoise and resize image for consistent CV/CNN input.
    if cv2 is not None:
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        denoised_bgr = cv2.fastNlMeansDenoisingColored(bgr, None, 7, 7, 7, 21)
        resized_bgr = cv2.resize(denoised_bgr, (224, 224), interpolation=cv2.INTER_AREA)
        resized_rgb = cv2.cvtColor(resized_bgr, cv2.COLOR_BGR2RGB)
        gray = cv2.cvtColor(resized_rgb, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 65, 150)
        laplacian_variance = float(cv2.Laplacian(gray, cv2.CV_32F).var())
    else:
        denoised = image.filter(ImageFilter.MedianFilter(size=3)).resize((224, 224), Image.Resampling.BILINEAR)
        resized_rgb = np.array(denoised, dtype=np.uint8)
        gray = np.mean(resized_rgb, axis=2).astype(np.uint8)
        gx = np.abs(np.diff(gray.astype(np.float32), axis=1, prepend=gray[:, :1]))
        gy = np.abs(np.diff(gray.astype(np.float32), axis=0, prepend=gray[:1, :]))
        edges = ((gx + gy) > 26.0).astype(np.uint8) * 255
        laplacian_variance = float(np.var(gx + gy))

    # Step 2: normalize pixels to a tensor for model inference.
    normalized = resized_rgb.astype(np.float32) / 255.0
    image_tensor = np.transpose(normalized, (2, 0, 1))[np.newaxis, ...]

    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))
    edge_density = float(np.mean(edges > 0))

    sharpness_score = clamp((laplacian_variance / 140.0) * 100.0, 8.0, 100.0)
    contrast_score = clamp((contrast / 42.0) * 100.0, 10.0, 100.0)
    edge_score = clamp(edge_density * 260.0, 8.0, 100.0)

    feature_clarity = clamp(
        (sharpness_score * 0.44) + (contrast_score * 0.28) + (edge_score * 0.28),
        10.0,
        100.0,
    )

    brightness_fit = clamp((1.0 - abs(brightness - 126.0) / 126.0) * 100.0, 10.0, 100.0)
    resolution_fit = clamp((min(original_h, original_w) / 900.0) * 100.0, 10.0, 100.0)
    image_quality = clamp(
        (feature_clarity * 0.62) + (brightness_fit * 0.2) + (resolution_fit * 0.18),
        10.0,
        100.0,
    )

    return {
        "mimeType": mime_type or "image/jpeg",
        "originalShape": [original_h, original_w, 3],
        "resizedShape": [224, 224, 3],
        "tensorShape": [1, 3, 224, 224],
        "normalized": True,
        "denoised": True,
        "edgeDetected": True,
        "pixelSignal": round(float(np.mean(normalized)) * 255.0, 2),
        "qualityFactor": round(image_quality / 100.0, 3),
        "imageQuality": round(image_quality, 1),
        "featureClarity": round(feature_clarity, 1),
        "brightness": round(brightness, 1),
        "contrast": round(contrast, 1),
        "edgeDensity": round(edge_density, 4),
        "_rgb": resized_rgb,
        "_gray": gray,
        "_edges": edges,
        "_tensor": image_tensor,
    }


def _compute_largest_leaf_mask(leaf_mask_u8: np.ndarray) -> np.ndarray:
    if cv2 is None:
        return leaf_mask_u8 > 0

    contours, _ = cv2.findContours(leaf_mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return leaf_mask_u8 > 0

    largest = max(contours, key=cv2.contourArea)
    largest_mask = np.zeros_like(leaf_mask_u8)
    cv2.drawContours(largest_mask, [largest], -1, 255, -1)
    return largest_mask > 0


def _connected_component_score(mask_u8: np.ndarray) -> float:
    if cv2 is None:
        area_ratio = float(np.mean(mask_u8 > 0))
        return clamp(area_ratio * 140.0, 0.0, 100.0)

    component_count, labels, stats, _ = cv2.connectedComponentsWithStats(mask_u8, connectivity=8)
    if component_count <= 1:
        return 0.0

    valid_components = 0
    for index in range(1, component_count):
        area = int(stats[index, cv2.CC_STAT_AREA])
        if area >= 6:
            valid_components += 1

    score = (valid_components / 18.0) * 100.0
    return clamp(score, 0.0, 100.0)


def _channel_histogram(channel: np.ndarray, bins: int = 16) -> List[float]:
    hist, _ = np.histogram(channel, bins=bins, range=(0, 255))
    denom = max(float(hist.sum()), 1.0)
    return [round(float(value / denom), 4) for value in hist]


def extract_features(preprocessed: Dict, crop_key: str) -> Dict:
    rgb = preprocessed.get("_rgb")
    gray = preprocessed.get("_gray")
    edges = preprocessed.get("_edges")

    if rgb is None or gray is None or edges is None:
        raise ValueError("preprocess_image must be called before extract_features")

    hsv = _to_hsv(rgb)

    h = hsv[..., 0].astype(np.float32)
    s = hsv[..., 1].astype(np.float32)
    v = hsv[..., 2].astype(np.float32)

    # Leaf segmentation driven by HSV thresholds.
    coarse_leaf_mask = ((s > 25.0) & (v > 28.0)).astype(np.uint8) * 255
    leaf_mask = _compute_largest_leaf_mask(coarse_leaf_mask)

    if np.mean(leaf_mask) < 0.18:
        leaf_mask = np.ones_like(leaf_mask, dtype=bool)

    leaf_area = max(float(np.sum(leaf_mask)), 1.0)

    green_mask = leaf_mask & (h >= 30.0) & (h <= 95.0) & (s >= 35.0) & (v >= 28.0)
    yellow_mask = leaf_mask & (h >= 16.0) & (h <= 38.0) & (s >= 36.0) & (v >= 70.0)
    purple_mask = leaf_mask & (h >= 120.0) & (h <= 170.0) & (s >= 40.0) & (v >= 26.0)

    lesion_mask = leaf_mask & (
        (((h >= 5.0) & (h <= 28.0) & (s >= 42.0) & (v <= 170.0))) |
        (v <= 62.0)
    )

    leaf_mask_u8 = leaf_mask.astype(np.uint8) * 255
    lesion_u8 = lesion_mask.astype(np.uint8) * 255

    if cv2 is not None:
        kernel = np.ones((3, 3), np.uint8)
        boundary = (cv2.dilate(leaf_mask_u8, kernel, iterations=1) - cv2.erode(leaf_mask_u8, kernel, iterations=1)) > 0
        contours, _ = cv2.findContours(leaf_mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if contours:
            largest = max(contours, key=cv2.contourArea)
            perimeter = max(float(cv2.arcLength(largest, True)), 1.0)
            area = max(float(cv2.contourArea(largest)), 1.0)
            edge_irregularity = clamp(((perimeter ** 2) / (4.0 * math.pi * area)) - 1.0, 0.0, 3.0)

            filled = np.zeros_like(leaf_mask_u8)
            cv2.drawContours(filled, [largest], -1, 255, -1)
            hole_pixels = np.logical_and(filled > 0, leaf_mask_u8 == 0).sum()
            leaf_hole_ratio = float(hole_pixels) / max(float(np.sum(filled > 0)), 1.0)
        else:
            edge_irregularity = 0.0
            leaf_hole_ratio = 0.0
    else:
        boundary = np.logical_xor(leaf_mask, np.pad(leaf_mask[1:, 1:], ((0, 1), (0, 1)), mode="edge"))
        edge_irregularity = clamp(float(np.mean(boundary)) * 3.5, 0.0, 3.0)
        leaf_hole_ratio = clamp(float(np.mean(lesion_mask)) * 0.4, 0.0, 1.0)

    boundary_pixels = max(float(np.sum(boundary)), 1.0)
    edge_damage_ratio = float(np.sum((edges > 0) & boundary)) / boundary_pixels

    red = rgb[..., 0].astype(np.float32)
    green = rgb[..., 1].astype(np.float32)
    blue = rgb[..., 2].astype(np.float32)

    edge_burn_mask = boundary & (red > (green + 16.0)) & (red > (blue + 10.0))

    green_leaf_ratio = float(np.sum(green_mask)) / leaf_area
    lesion_area_ratio = float(np.sum(lesion_mask)) / leaf_area
    yellow_area_ratio = float(np.sum(yellow_mask)) / leaf_area
    purple_tint_ratio = float(np.sum(purple_mask)) / leaf_area
    edge_burn_ratio = float(np.sum(edge_burn_mask)) / boundary_pixels

    spot_cluster_score = _connected_component_score(lesion_u8)

    edge_density = float(np.mean(edges > 0))
    texture = clamp((float(np.std(gray)) * 2.15) + (edge_density * 35.0), 6.0, 100.0)
    color_variance = clamp(float(np.std(rgb.reshape(-1, 3), axis=0).mean()) * 2.3, 5.0, 100.0)

    spot_pattern = clamp((lesion_area_ratio * 185.0) + (spot_cluster_score * 0.58), 0.0, 100.0)
    edge_complexity = clamp((edge_density * 220.0) + (edge_irregularity * 24.0) + (leaf_hole_ratio * 120.0), 0.0, 100.0)
    chewing_damage_score = clamp((leaf_hole_ratio * 180.0) + (edge_damage_ratio * 120.0) + (edge_irregularity * 10.0), 0.0, 100.0)
    moisture_signature = clamp(44.0 + (green_leaf_ratio * 55.0) - (yellow_area_ratio * 36.0) - (edge_burn_ratio * 38.0), 0.0, 100.0)

    feature_clarity = safe_float(preprocessed.get("featureClarity"), 70.0)

    return {
        "cropKey": sanitize_crop_type(crop_key),
        "texture": round(texture, 2),
        "colorVariance": round(color_variance, 2),
        "spotPattern": round(spot_pattern, 2),
        "edgeComplexity": round(edge_complexity, 2),
        "moistureSignature": round(moisture_signature, 2),
        "featureClarity": round(feature_clarity, 2),
        "colorHistogram": {
            "r": _channel_histogram(rgb[..., 0]),
            "g": _channel_histogram(rgb[..., 1]),
            "b": _channel_histogram(rgb[..., 2]),
        },
        "greenLeafRatio": round(green_leaf_ratio, 4),
        "lesionAreaRatio": round(lesion_area_ratio, 4),
        "spotClusterScore": round(spot_cluster_score, 2),
        "edgeDamageRatio": round(edge_damage_ratio, 4),
        "leafHoleRatio": round(leaf_hole_ratio, 4),
        "chewingDamageScore": round(chewing_damage_score, 2),
        "yellowAreaRatio": round(yellow_area_ratio, 4),
        "purpleTintRatio": round(purple_tint_ratio, 4),
        "edgeBurnRatio": round(edge_burn_ratio, 4),
        "edgeIrregularity": round(edge_irregularity, 4),
    }


def model_inference(features: Dict, module_name: str) -> Dict:
    lesion = safe_float(features.get("lesionAreaRatio"), 0.0) * 100.0
    spot = safe_float(features.get("spotClusterScore"), 0.0)
    edge_damage = safe_float(features.get("edgeDamageRatio"), 0.0) * 100.0
    hole = safe_float(features.get("leafHoleRatio"), 0.0) * 100.0
    chew = safe_float(features.get("chewingDamageScore"), 0.0)
    yellow = safe_float(features.get("yellowAreaRatio"), 0.0) * 100.0
    purple = safe_float(features.get("purpleTintRatio"), 0.0) * 100.0
    edge_burn = safe_float(features.get("edgeBurnRatio"), 0.0) * 100.0
    green = safe_float(features.get("greenLeafRatio"), 0.0) * 100.0
    texture = safe_float(features.get("texture"), 50.0)
    color_variance = safe_float(features.get("colorVariance"), 50.0)
    clarity = safe_float(features.get("featureClarity"), 70.0)

    if module_name == "disease":
        raw_score = 18.0 + (lesion * 0.43) + (spot * 0.31) + ((100.0 - green) * 0.16) + (edge_damage * 0.10)
    elif module_name == "pest":
        raw_score = 14.0 + (chew * 0.46) + (hole * 0.24) + (edge_damage * 0.2) + (texture * 0.1)
    elif module_name == "nutrient":
        raw_score = 16.0 + (yellow * 0.45) + (purple * 0.26) + (edge_burn * 0.2) + ((100.0 - green) * 0.09)
    elif module_name == "health-score":
        stress = (lesion * 0.32) + (chew * 0.24) + (yellow * 0.22) + (edge_burn * 0.12) + (hole * 0.1)
        raw_score = 100.0 - stress
    elif module_name == "crop":
        raw_score = 42.0 + (texture * 0.17) + (color_variance * 0.12) + (green * 0.21) + (clarity * 0.16)
    else:
        raw_score = 28.0 + (lesion * 0.22) + (chew * 0.2) + (yellow * 0.2) + (clarity * 0.18)

    return {
        "module": module_name,
        "rawScore": round(clamp(raw_score, 0.0, 100.0), 2),
        "featureClarity": round(clarity, 2),
        "signals": {
            "lesion": round(lesion, 2),
            "edgeDamage": round(edge_damage, 2),
            "chewing": round(chew, 2),
            "yellowing": round(yellow, 2),
            "purpleTint": round(purple, 2),
            "greenLeaf": round(green, 2),
        },
    }


def confidence_adjust(base_confidence: float, image_factor: float) -> float:
    adjusted = safe_float(base_confidence, 70.0) * (0.7 + (clamp(safe_float(image_factor, 0.7), 0.0, 1.0) * 0.3))
    return round(clamp(adjusted, 35.0, 99.0), 1)


def confidence_scoring(
    base_confidence: float,
    inference: Dict,
    image_factor: float,
    feature_clarity: Optional[float] = None,
    weather_risk: float = 0.0,
    model_confidence: Optional[float] = None,
) -> float:
    base = clamp(safe_float(base_confidence, 70.0), 0.0, 100.0)
    model_score = clamp(
        safe_float(model_confidence, safe_float(inference.get("rawScore"), base)),
        0.0,
        100.0,
    )
    image_quality = clamp(safe_float(image_factor, 0.7) * 100.0, 0.0, 100.0)
    clarity = clamp(
        safe_float(feature_clarity, safe_float(inference.get("featureClarity"), 70.0)),
        0.0,
        100.0,
    )
    weather_penalty = clamp(safe_float(weather_risk, 0.0), 0.0, 100.0) * 0.23

    score = (
        (base * 0.42)
        + (model_score * 0.3)
        + (image_quality * 0.16)
        + (clarity * 0.12)
        - weather_penalty
    )

    return round(clamp(score, 35.0, 99.0), 1)


def ensemble_confidence(
    model_confidences: List[float],
    image_quality: float,
    feature_clarity: float,
    weather_risk: float,
) -> float:
    cleaned = [clamp(safe_float(value, 0.0), 0.0, 100.0) for value in model_confidences if value is not None]
    if not cleaned:
        return 50.0

    avg_model_conf = sum(cleaned) / len(cleaned)
    score = (
        (avg_model_conf * 0.55)
        + (clamp(safe_float(image_quality, 70.0), 0.0, 100.0) * 0.2)
        + (clamp(safe_float(feature_clarity, 70.0), 0.0, 100.0) * 0.2)
        + ((100.0 - clamp(safe_float(weather_risk, 0.0), 0.0, 100.0)) * 0.05)
    )

    return round(clamp(score, 35.0, 99.0), 1)


def severity_to_score(severity: str) -> int:
    map_score = {
        "Low": 28,
        "Medium": 58,
        "Moderate": 66,
        "High": 82,
        "Severe": 93,
    }

    return int(map_score.get(str(severity or "Medium"), 55))


def score_to_severity(score: float) -> str:
    safe = safe_float(score, 0.0)

    if safe >= 80:
        return "High"

    if safe >= 55:
        return "Moderate"

    if safe >= 35:
        return "Medium"

    return "Low"


def chart_points(labels: List[str], values: List[float]) -> List[Dict]:
    rows = []

    for index, label in enumerate(labels):
        value = values[index] if index < len(values) else values[-1]
        rows.append({"label": label, "value": round(float(value), 2)})

    return rows


def pipeline_snapshot(preprocessed: Dict, features: Dict, inference: Dict) -> Dict:
    preprocessed_public = {
        key: value
        for key, value in preprocessed.items()
        if not str(key).startswith("_")
    }

    features_public = {
        key: value
        for key, value in features.items()
        if key != "colorHistogram"
    }

    features_public["colorHistogram"] = {
        "r": (features.get("colorHistogram", {}).get("r") or [])[:8],
        "g": (features.get("colorHistogram", {}).get("g") or [])[:8],
        "b": (features.get("colorHistogram", {}).get("b") or [])[:8],
    }

    return {
        "preprocessing": preprocessed_public,
        "features": features_public,
        "inference": inference,
    }


def infer_crop_from_features(features: Dict, payload_crop_key: str = "") -> Dict:
    texture = safe_float(features.get("texture"), 60.0)
    variance = safe_float(features.get("colorVariance"), 60.0)
    pattern = safe_float(features.get("spotPattern"), 60.0)
    edge = safe_float(features.get("edgeComplexity"), 60.0)
    moisture = safe_float(features.get("moistureSignature"), 60.0)
    green_ratio = safe_float(features.get("greenLeafRatio"), 0.6)
    yellow_ratio = safe_float(features.get("yellowAreaRatio"), 0.12)

    rows = []

    for crop_key, signature in CROP_SIGNATURE_LIBRARY.items():
        distance = (
            abs(texture - signature["texture"]) * 0.22
            + abs(variance - signature["colorVariance"]) * 0.16
            + abs(pattern - signature["spotPattern"]) * 0.19
            + abs(edge - signature["edgeComplexity"]) * 0.14
            + abs(moisture - signature["moistureSignature"]) * 0.12
            + abs(green_ratio - signature["greenLeafRatio"]) * 100.0 * 0.1
            + abs(yellow_ratio - signature["yellowAreaRatio"]) * 100.0 * 0.07
        )

        score = clamp(100.0 - distance, 8.0, 99.0)
        rows.append((crop_key, score))

    rows.sort(key=lambda row: row[1], reverse=True)

    best_key, best_score = rows[0]
    second_score = rows[1][1] if len(rows) > 1 else best_score
    gap = max(best_score - second_score, 0.0)

    confidence = clamp((best_score * 0.74) + (gap * 1.6), 40.0, 97.0)

    selected_key = sanitize_crop_type(payload_crop_key)
    selected_was_provided = bool(str(payload_crop_key or "").strip())
    is_payload_match = (selected_key == best_key) if selected_was_provided else True

    if confidence >= 82 and is_payload_match:
        agreement = "high"
    elif confidence >= 70:
        agreement = "medium"
    else:
        agreement = "low"

    alternatives = [
        {
            "key": crop_key,
            "name": crop_display_name(crop_key),
            "score": round(score, 1),
        }
        for crop_key, score in rows[:3]
    ]

    return {
        "predictedCropKey": best_key,
        "predictedCropName": crop_display_name(best_key),
        "confidence": round(confidence, 1),
        "selectedCropKey": selected_key,
        "selectedCropName": crop_display_name(selected_key),
        "isPayloadMatch": is_payload_match,
        "agreement": agreement,
        "alternatives": alternatives,
    }
