import math
from datetime import date
from typing import Dict

from .common import (
    chart_points,
    clamp,
    confidence_from_scores,
    crop_profile,
    environment_scores,
    hectares_from_acres,
    irrigation_factor,
    month_seasonality,
    soil_factor,
    module_envelope,
    parse_date,
    safe_float
)


def predict(payload: Dict) -> Dict:
    profile = crop_profile(payload.get("cropType", ""))
    scores = environment_scores(payload)

    farm_size_acres = safe_float(payload.get("farmSizeAcres"), 1.0, 0.1, 5000.0)
    hectares = hectares_from_acres(farm_size_acres)

    yield_min = profile["yield_min_tpha"]
    yield_max = profile["yield_max_tpha"]
    yield_span = max(yield_max - yield_min, 0.5)

    soil_multiplier = soil_factor(payload.get("soilType", "loamy"))
    irrigation_multiplier = irrigation_factor(payload.get("irrigationMethod", "drip"))

    agro_component = clamp(scores["agro_score"] / 100.0, 0.0, 1.0)
    soil_component = clamp((soil_multiplier - 0.82) / 0.24, 0.0, 1.0)
    irrigation_component = clamp((irrigation_multiplier - 0.8) / 0.3, 0.0, 1.0)

    expected_yield_tpha = yield_min + (yield_span * ((agro_component * 0.62) + (soil_component * 0.22) + (irrigation_component * 0.16)))
    expected_yield_tpha = clamp(expected_yield_tpha, yield_min, yield_max)

    harvest_date = parse_date(payload.get("expectedHarvestDate", ""))
    harvest_month = harvest_date.month if isinstance(harvest_date, date) else date.today().month

    seasonal_factor = month_seasonality(harvest_month)
    volatility_seed = (scores["temperature"] * 1.7) + (scores["humidity"] * 1.1) + (scores["agro_score"] * 0.9) + (harvest_month * 5.0)
    price_variation = clamp(math.sin(volatility_seed / 17.0) * 0.08, -0.08, 0.08)

    price_per_quintal = profile["market_base_price"] * seasonal_factor * (1.0 + price_variation)
    price_per_quintal = clamp(price_per_quintal, 1200.0, 9200.0)

    total_quintal = expected_yield_tpha * hectares * 10.0
    revenue = total_quintal * price_per_quintal

    seed_cost = profile.get("cost_seed_per_hectare", profile["production_cost_per_hectare"] * 0.18) * hectares
    fertilizer_cost = profile.get("cost_fertilizer_per_hectare", profile["production_cost_per_hectare"] * 0.3) * hectares
    labor_cost = profile.get("cost_labor_per_hectare", profile["production_cost_per_hectare"] * 0.34) * hectares

    base_irrigation_cost = profile.get("cost_irrigation_per_hectare", profile["production_cost_per_hectare"] * 0.18)
    irrigation_cost = base_irrigation_cost * hectares * clamp(1.08 + (1.0 - irrigation_multiplier) * 0.5, 0.9, 1.4)

    cost = seed_cost + fertilizer_cost + labor_cost + irrigation_cost

    profit = revenue - cost

    best_case_revenue = (price_per_quintal * 1.06) * (total_quintal * 1.05)
    worst_case_revenue = (price_per_quintal * 0.92) * (total_quintal * 0.92)

    best_case_profit = best_case_revenue - (cost * 0.97)
    worst_case_profit = worst_case_revenue - (cost * 1.05)

    confidence = confidence_from_scores(
        scores["agro_score"],
        100.0 - (abs(price_variation) * 625.0),
        soil_component * 100.0,
        irrigation_component * 100.0
    )

    monthly_projection = [
        -(seed_cost + (labor_cost * 0.25)),
        -((fertilizer_cost * 0.55) + (irrigation_cost * 0.35)),
        -((fertilizer_cost * 0.45) + (irrigation_cost * 0.40)),
        revenue * 0.22,
        revenue * 0.43,
        profit
    ]

    profit_margin = (profit / revenue) if revenue > 0 else -1.0
    recommendation = (
        "Optimize input timing and secure market contracts to reduce downside risk"
        if profit_margin < 0.30
        else "Maintain current strategy and plan phased selling for better realization"
    )

    explanation = (
        f"Projected revenue near Rs {int(revenue):,} against cost Rs {int(cost):,} gives estimated profit Rs {int(profit):,}. "
        f"Price volatility factor applied: {round(price_variation * 100.0, 1)}%."
    )

    return module_envelope(
        key="profit",
        title="AI Profit Prediction",
        result_label="Expected Profit",
        result_value=f"Rs {int(profit):,}",
        confidence=confidence,
        recommendation=recommendation,
        explanation=explanation,
        chart_type="bar",
        chart_data=chart_points(["M1", "M2", "M3", "M4", "M5", "M6"], monthly_projection),
        metrics=[
            {"label": "Estimated Revenue", "value": f"Rs {int(revenue):,}"},
            {"label": "Estimated Cost", "value": f"Rs {int(cost):,}"},
            {
                "label": "Cost Breakdown",
                "value": (
                    f"Seed Rs {int(seed_cost):,}, Fertilizer Rs {int(fertilizer_cost):,}, "
                    f"Labor Rs {int(labor_cost):,}, Irrigation Rs {int(irrigation_cost):,}"
                )
            },
            {"label": "Net Profit", "value": f"Rs {int(profit):,}"},
            {"label": "Best Case Profit", "value": f"Rs {int(best_case_profit):,}"},
            {"label": "Worst Case Profit", "value": f"Rs {int(worst_case_profit):,}"}
        ],
        model_name="Farm Profit Scenario Engine",
        model_family="Deterministic Agronomy Model"
    )
