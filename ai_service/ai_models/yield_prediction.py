from typing import Dict, Optional

from .common import (
    chart_points,
    clamp,
    confidence_from_scores,
    crop_profile,
    environment_scores,
    growth_curve_by_crop,
    irrigation_factor,
    module_envelope,
    recommendation_sentence,
    safe_float,
    soil_factor
)


def _extract_pest_risk(payload: Dict) -> Optional[float]:
    candidates = [
        payload.get("pestRiskIndex"),
        payload.get("pestRisk"),
        (payload.get("pest") or {}).get("riskIndex") if isinstance(payload.get("pest"), dict) else None,
        (payload.get("pest") or {}).get("risk") if isinstance(payload.get("pest"), dict) else None,
        (payload.get("modules") or {}).get("pest", {}).get("riskIndex")
        if isinstance((payload.get("modules") or {}).get("pest"), dict)
        else None,
        (payload.get("modules") or {}).get("pest", {}).get("risk")
        if isinstance((payload.get("modules") or {}).get("pest"), dict)
        else None
    ]

    for candidate in candidates:
        if candidate is None:
            continue

        parsed = safe_float(candidate, -1.0)
        if parsed >= 0.0:
            return clamp(parsed, 0.0, 100.0)

    return None


def predict(payload: Dict) -> Dict:
    profile = crop_profile(payload.get("cropType", ""))
    scores = environment_scores(payload)

    yield_min = profile["yield_min_tpha"]
    yield_max = profile["yield_max_tpha"]
    yield_span = max(yield_max - yield_min, 0.5)

    soil_multiplier = soil_factor(payload.get("soilType", "loamy"))
    irrigation_multiplier = irrigation_factor(payload.get("irrigationMethod", "drip"))

    agro_component = clamp(scores["agro_score"] / 100.0, 0.0, 1.0)
    soil_component = clamp((soil_multiplier - 0.82) / 0.24, 0.0, 1.0)
    irrigation_component = clamp((irrigation_multiplier - 0.8) / 0.3, 0.0, 1.0)

    env_multiplier = clamp(
        (agro_component * 0.65) +
        (soil_component * 0.2) +
        (irrigation_component * 0.15),
        0.0,
        1.0
    )

    expected_yield = yield_min + (yield_span * env_multiplier)

    pest_risk = _extract_pest_risk(payload)
    pest_penalty_factor = 0.0
    if pest_risk is not None and pest_risk > 0.0:
        pest_penalty_factor = clamp((pest_risk - 35.0) / 100.0, 0.0, 0.22)
        expected_yield *= (1.0 - pest_penalty_factor)

    expected_yield = clamp(expected_yield, yield_min, yield_max)

    confidence = confidence_from_scores(
        scores["agro_score"],
        agro_component * 100.0,
        soil_component * 100.0,
        irrigation_component * 100.0,
        100.0 - (pest_risk or 0.0)
    )

    growth_curve = growth_curve_by_crop(payload.get("cropType", ""), expected_yield)

    if pest_risk is not None and pest_risk >= 60.0:
        recommendation = "Pest pressure is high; combine integrated pest management with nutrient support to protect yield"
    elif scores["agro_score"] < 70.0:
        recommendation = recommendation_sentence(
            "Improve agro conditions with moisture balancing and stress reduction to recover yield by",
            "6-10%"
        )
    else:
        recommendation = recommendation_sentence(
            "Use split NPK feeding and micronutrient foliar spray to improve grain formation by",
            "8-12%"
        )

    pest_note = (
        f" Pest risk input {round(safe_float(pest_risk, 0.0), 1)}/100 reduced forecast by {round(pest_penalty_factor * 100.0, 1)}%."
        if pest_risk is not None
        else ""
    )

    explanation = (
        f"Yield range for {payload.get('cropType', 'crop').title()} is {round(yield_min, 2)}-{round(yield_max, 2)} t/ha. "
        f"Current agro score {round(scores['agro_score'], 1)}/100 with soil factor {round(soil_multiplier, 2)}x "
        f"and irrigation factor {round(irrigation_multiplier, 2)}x supports expected yield {round(expected_yield, 2)} t/ha."
        f"{pest_note}"
    )

    return module_envelope(
        key="yield",
        title="AI Crop Yield Prediction",
        result_label="Expected Yield",
        result_value=f"{round(expected_yield, 2)} tons per hectare",
        confidence=confidence,
        recommendation=recommendation,
        explanation=explanation,
        chart_type="area",
        chart_data=chart_points(["Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5", "Harvest"], growth_curve),
        metrics=[
            {"label": "Expected Yield", "value": f"{round(expected_yield, 2)} t/ha"},
            {"label": "Yield Range", "value": f"{round(yield_min, 1)}-{round(yield_max, 1)} t/ha"},
            {"label": "Soil Factor", "value": f"{round(soil_multiplier, 2)}x"}
        ],
        model_name="Yield Range Composite",
        model_family="Deterministic Agronomy Model"
    )
