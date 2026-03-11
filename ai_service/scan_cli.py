import json
import sys
from typing import Any, Dict

from ai_scan_models import crop_classifier
from ai_scan_models import crop_disease_detection
from ai_scan_models import pest_detection
from ai_scan_models import nutrient_deficiency_detection
from ai_scan_models import crop_health_score
from ai_scan_models import treatment_recommendation

MODULES = {
    "crop": crop_classifier.predict,
    "disease": crop_disease_detection.predict,
    "pest": pest_detection.predict,
    "nutrient": nutrient_deficiency_detection.predict,
    "health-score": crop_health_score.predict,
    "treatment": treatment_recommendation.predict
}


def _read_payload() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()

    if not raw:
        return {}

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid input JSON: {error}") from error

    if not isinstance(parsed, dict):
        raise ValueError("Input payload must be a JSON object")

    return parsed


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Module key is required"}))
        return 2

    module_key = sys.argv[1].strip().lower()

    if module_key not in MODULES:
        print(json.dumps({"error": f"Unknown module: {module_key}"}))
        return 2

    try:
        payload = _read_payload()
        result = MODULES[module_key](payload)
    except Exception as error:  # pragma: no cover - defensive path for CLI use
        print(json.dumps({"error": str(error)}))
        return 1

    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
