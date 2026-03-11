import json
import sys
from typing import Any, Callable, Dict

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
from ai_scan_models import crop_classifier
from ai_scan_models import crop_disease_detection
from ai_scan_models import crop_health_score
from ai_scan_models import nutrient_deficiency_detection
from ai_scan_models import pest_detection
from ai_scan_models import treatment_recommendation

PredictFn = Callable[[Dict[str, Any]], Any]

PREDICT_MODULES: Dict[str, PredictFn] = {
    "crop-health-risk": crop_health_risk_prediction.predict,
    "yield": yield_prediction.predict,
    "irrigation": irrigation_prediction.predict,
    "pest": pest_prediction.predict,
    "market": market_price_prediction.predict,
    "profit": profit_prediction.predict,
    "crop": crop_recommendation.predict,
    "weather": weather_risk_prediction.predict,
    "farm-health": farm_health_score.predict,
    "climate-risk": climate_risk_engine.predict,
}

SCAN_MODULES: Dict[str, PredictFn] = {
    "crop": crop_classifier.predict,
    "disease": crop_disease_detection.predict,
    "pest": pest_detection.predict,
    "nutrient": nutrient_deficiency_detection.predict,
    "health-score": crop_health_score.predict,
    "treatment": treatment_recommendation.predict,
}

PIPELINES: Dict[str, Dict[str, PredictFn]] = {
    "predict": PREDICT_MODULES,
    "prediction": PREDICT_MODULES,
    "scan": SCAN_MODULES,
}


def _read_payload() -> Dict[str, Any]:
    if sys.stdin is None or sys.stdin.isatty():
        return {}

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


def _usage() -> str:
    return (
        "Usage: main_cli.py <predict|scan> <module-key|--all>\n"
        "       main_cli.py <predict|scan>\n"
        "       main_cli.py [--all]"
    )


def _parse_args() -> tuple[str, str]:
    args = [arg.strip().lower() for arg in sys.argv[1:] if arg.strip()]

    if not args:
        return "all", "all"

    if len(args) > 2:
        raise ValueError(_usage())

    if len(args) == 1:
        first = args[0]

        if first in {"--all", "all"}:
            return "all", "all"

        if first in PIPELINES:
            return first, "all"

        raise ValueError(f"Unknown pipeline: {first}\n{_usage()}")

    pipeline = args[0]
    module_key = args[1]

    if pipeline not in PIPELINES:
        raise ValueError(f"Unknown pipeline: {pipeline}\n{_usage()}")

    return pipeline, module_key


def _run_single(modules: Dict[str, PredictFn], module_key: str, payload: Dict[str, Any]) -> Any:
    if module_key not in modules:
        raise ValueError(f"Unknown module: {module_key}")

    return modules[module_key](payload)


def _run_all(modules: Dict[str, PredictFn], payload: Dict[str, Any]) -> Dict[str, Any]:
    results: Dict[str, Any] = {}

    for module_key, module_fn in modules.items():
        try:
            results[module_key] = module_fn(payload)
        except Exception as error:  # pragma: no cover - keep all-mode resilient
            results[module_key] = {"error": str(error)}

    return results


def main() -> int:
    try:
        pipeline, module_key = _parse_args()
        payload = _read_payload()

        if pipeline == "all":
            result = {
                "predict": _run_all(PREDICT_MODULES, payload),
                "scan": _run_all(SCAN_MODULES, payload),
            }
        else:
            modules = PIPELINES[pipeline]

            if module_key in {"--all", "all"}:
                result = _run_all(modules, payload)
            else:
                result = _run_single(modules, module_key, payload)
    except Exception as error:  # pragma: no cover - safety net for CLI execution
        print(json.dumps({"error": str(error)}))
        return 1

    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())