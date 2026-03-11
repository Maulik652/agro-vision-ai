"""
AgroVision AI — Unified Model Runner
=====================================
Run ALL AI prediction and scan models in one shot with sample data.

Usage:
    python run_all_models.py                  # Run everything
    python run_all_models.py predict          # Only prediction models
    python run_all_models.py scan             # Only scan models
    python run_all_models.py predict yield    # Single prediction model
    python run_all_models.py scan disease     # Single scan model
"""

import base64
import io
import json
import sys
import time
from typing import Any, Dict

import numpy as np
from PIL import Image

# ── Prediction models ────────────────────────────────────────────────────────
from ai_models import climate_risk_engine
from ai_models import crop_health_risk_prediction
from ai_models import crop_recommendation
from ai_models import farm_health_score
from ai_models import irrigation_prediction
from ai_models import market_price_prediction
from ai_models import pest_prediction
from ai_models import profit_prediction
from ai_models import weather_risk_prediction
from ai_models import yield_prediction

# ── Scan models ──────────────────────────────────────────────────────────────
from ai_scan_models import crop_classifier
from ai_scan_models import crop_disease_detection
from ai_scan_models import crop_health_score as scan_health_score
from ai_scan_models import nutrient_deficiency_detection
from ai_scan_models import pest_detection as scan_pest_detection
from ai_scan_models import treatment_recommendation

# ─────────────────────────────────────────────────────────────────────────────

PREDICT_MODULES: Dict[str, Any] = {
    "crop-health-risk": crop_health_risk_prediction,
    "yield":            yield_prediction,
    "irrigation":       irrigation_prediction,
    "pest":             pest_prediction,
    "market":           market_price_prediction,
    "profit":           profit_prediction,
    "crop":             crop_recommendation,
    "weather":          weather_risk_prediction,
    "farm-health":      farm_health_score,
    "climate-risk":     climate_risk_engine,
}

SCAN_MODULES: Dict[str, Any] = {
    "crop":         crop_classifier,
    "disease":      crop_disease_detection,
    "pest":         scan_pest_detection,
    "nutrient":     nutrient_deficiency_detection,
    "health-score": scan_health_score,
    "treatment":    treatment_recommendation,
}

# ── Sample payloads ──────────────────────────────────────────────────────────

SAMPLE_PREDICT_PAYLOAD: Dict[str, Any] = {
    "cropType":             "Rice",
    "temperature":          30.5,
    "humidity":             72.0,
    "rainfall":             135.0,
    "soilMoisture":         68.0,
    "soilType":             "loamy",
    "irrigationMethod":     "drip",
    "farmSizeAcres":        5.0,
    "expectedHarvestDate":  "2026-06-15",
}


def _generate_test_image_base64() -> str:
    """Create a small synthetic green-leaf image for scan models."""
    rng = np.random.RandomState(42)
    img_array = rng.randint(20, 60, (128, 128, 3), dtype=np.uint8)
    img_array[:, :, 1] = rng.randint(80, 180, (128, 128), dtype=np.uint8)  # green channel
    img = Image.fromarray(img_array, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _build_scan_payload() -> Dict[str, Any]:
    return {
        "cropType":    "Rice",
        "imageBase64": _generate_test_image_base64(),
        "mimeType":    "image/jpeg",
    }

# ── Pretty printing ─────────────────────────────────────────────────────────

BLUE   = "\033[94m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"
SEP    = "─" * 70


def _print_header(title: str) -> None:
    print(f"\n{BOLD}{CYAN}{'═' * 70}")
    print(f"  {title}")
    print(f"{'═' * 70}{RESET}\n")


def _print_model_result(name: str, result: Any, elapsed: float, success: bool) -> None:
    status = f"{GREEN}✓ PASS{RESET}" if success else f"{RED}✗ FAIL{RESET}"
    print(f"  {status}  {BOLD}{name}{RESET}  ({elapsed:.3f}s)")

    if not success:
        print(f"         {RED}{result}{RESET}")
        return

    if isinstance(result, dict):
        # Show key metrics in compact form
        highlights = []
        for key in ("riskIndex", "predictedYield", "score", "healthScore",
                     "predictedPrice", "netProfit", "recommendation",
                     "topCrop", "daysUntilIrrigation", "pestName",
                     "disease", "pest", "nutrient", "crop", "health",
                     "overallHealthScore", "treatment"):
            if key in result:
                val = result[key]
                if isinstance(val, dict):
                    sub_name = val.get("name") or val.get("label") or val.get("predictedCropKey", "")
                    sub_score = val.get("score") or val.get("confidence") or val.get("severity", "")
                    highlights.append(f"{key}={sub_name} ({sub_score})")
                elif isinstance(val, float):
                    highlights.append(f"{key}={val:.2f}")
                else:
                    highlights.append(f"{key}={val}")
        if highlights:
            print(f"         {YELLOW}{' | '.join(highlights[:4])}{RESET}")


def _run_module(name: str, module: Any, payload: Dict[str, Any]) -> tuple:
    start = time.perf_counter()
    try:
        result = module.predict(payload)
        elapsed = time.perf_counter() - start
        return result, elapsed, True
    except Exception as exc:
        elapsed = time.perf_counter() - start
        return str(exc), elapsed, False


# ── Main logic ───────────────────────────────────────────────────────────────

def run_predict(module_key: str = "all") -> Dict[str, Any]:
    _print_header("PREDICTION MODELS  (10 modules)")
    print(f"  {BLUE}Sample input: cropType={SAMPLE_PREDICT_PAYLOAD['cropType']}, "
          f"temp={SAMPLE_PREDICT_PAYLOAD['temperature']}°C, "
          f"humidity={SAMPLE_PREDICT_PAYLOAD['humidity']}%, "
          f"rainfall={SAMPLE_PREDICT_PAYLOAD['rainfall']}mm{RESET}")
    print(f"  {SEP}")

    results = {}
    passed = failed = 0

    modules = PREDICT_MODULES
    if module_key != "all":
        if module_key not in modules:
            print(f"  {RED}Unknown module: {module_key}{RESET}")
            print(f"  Available: {', '.join(modules.keys())}")
            return {}
        modules = {module_key: modules[module_key]}

    for name, mod in modules.items():
        result, elapsed, success = _run_module(name, mod, SAMPLE_PREDICT_PAYLOAD)
        _print_model_result(name, result, elapsed, success)
        results[name] = result
        if success:
            passed += 1
        else:
            failed += 1

    print(f"\n  {SEP}")
    print(f"  {BOLD}Prediction results: {GREEN}{passed} passed{RESET}, "
          f"{RED if failed else RESET}{failed} failed{RESET}")
    return results


def run_scan(module_key: str = "all") -> Dict[str, Any]:
    _print_header("SCAN MODELS  (6 modules)")
    scan_payload = _build_scan_payload()
    print(f"  {BLUE}Sample input: cropType={scan_payload['cropType']}, "
          f"image=128×128 synthetic JPEG{RESET}")
    print(f"  {SEP}")

    results = {}
    passed = failed = 0

    modules = SCAN_MODULES
    if module_key != "all":
        if module_key not in modules:
            print(f"  {RED}Unknown module: {module_key}{RESET}")
            print(f"  Available: {', '.join(modules.keys())}")
            return {}
        modules = {module_key: modules[module_key]}

    for name, mod in modules.items():
        result, elapsed, success = _run_module(name, mod, scan_payload)
        _print_model_result(name, result, elapsed, success)
        results[name] = result
        if success:
            passed += 1
        else:
            failed += 1

    print(f"\n  {SEP}")
    print(f"  {BOLD}Scan results: {GREEN}{passed} passed{RESET}, "
          f"{RED if failed else RESET}{failed} failed{RESET}")
    return results


def main() -> int:
    args = [a.strip().lower() for a in sys.argv[1:] if a.strip()]

    pipeline = args[0] if len(args) >= 1 else "all"
    module_key = args[1] if len(args) >= 2 else "all"

    print(f"\n{BOLD}{CYAN}╔══════════════════════════════════════════════════════════════════════╗")
    print(f"║           AgroVision AI — Unified Model Runner                     ║")
    print(f"╚══════════════════════════════════════════════════════════════════════╝{RESET}")

    all_results = {}
    total_start = time.perf_counter()

    if pipeline in ("all", "predict", "prediction"):
        all_results["predict"] = run_predict(module_key if pipeline != "all" else "all")

    if pipeline in ("all", "scan"):
        all_results["scan"] = run_scan(module_key if pipeline != "all" else "all")

    if pipeline not in ("all", "predict", "prediction", "scan"):
        print(f"\n  {RED}Unknown pipeline: {pipeline}{RESET}")
        print(f"  Usage: python run_all_models.py [predict|scan] [module-key]")
        return 1

    total_elapsed = time.perf_counter() - total_start

    print(f"\n{BOLD}{CYAN}{'═' * 70}")
    print(f"  Total execution time: {total_elapsed:.3f}s")
    print(f"{'═' * 70}{RESET}")

    # Write full JSON output to file for inspection
    output_file = "all_models_output.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, default=str)
    print(f"\n  Full JSON output saved to: {BOLD}{output_file}{RESET}\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
