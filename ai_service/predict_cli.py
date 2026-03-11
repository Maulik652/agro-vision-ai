import json
import sys
from typing import Any, Dict

from ai_models import crop_health_risk_prediction
from ai_models import yield_prediction
from ai_models import irrigation_prediction
from ai_models import pest_prediction
from ai_models import market_price_prediction
from ai_models import profit_prediction
from ai_models import crop_recommendation
from ai_models import weather_risk_prediction
from ai_models import farm_health_score
from ai_models import climate_risk_engine

MODULES = {
    "crop-health-risk": crop_health_risk_prediction.predict,
    "yield": yield_prediction.predict,
    "irrigation": irrigation_prediction.predict,
    "pest": pest_prediction.predict,
    "market": market_price_prediction.predict,
    "profit": profit_prediction.predict,
    "crop": crop_recommendation.predict,
    "weather": weather_risk_prediction.predict,
    "farm-health": farm_health_score.predict,
    "climate-risk": climate_risk_engine.predict
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
    except Exception as error:  # pragma: no cover - safety net for CLI execution
        print(json.dumps({"error": str(error)}))
        return 1

    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
