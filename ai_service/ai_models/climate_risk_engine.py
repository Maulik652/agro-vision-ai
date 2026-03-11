from datetime import date
from typing import Dict

from .common import (
    chart_points,
    confidence_from_scores,
    crop_profile,
    environment_scores,
    module_envelope,
    month_seasonality,
    parse_date,
    clamp
)


def predict(payload: Dict) -> Dict:
    profile = crop_profile(payload.get("cropType", ""))
    scores = environment_scores(payload)

    harvest_date = parse_date(payload.get("expectedHarvestDate", ""))
    month = harvest_date.month if isinstance(harvest_date, date) else date.today().month

    seasonal = month_seasonality(month)

    drought_risk = clamp((profile["opt_rainfall"] - scores["rainfall"]) * 1.4 + (60.0 - scores["soil_moisture"]) * 0.8, 5.0, 95.0)
    flood_risk = clamp((scores["rainfall"] - profile["opt_rainfall"]) * 1.6 + (scores["humidity"] - profile["opt_humidity"]) * 1.2, 5.0, 95.0)
    heat_risk = clamp((scores["temperature"] - profile["opt_temp"]) * 5.4 + 34.0, 5.0, 95.0)

    climate_risk_index = clamp(
        (drought_risk * 0.34) + (flood_risk * 0.33) + (heat_risk * 0.33) + ((seasonal - 1.0) * 70.0),
        6.0,
        96.0
    )

    if climate_risk_index >= 74:
        risk_level = "High"
    elif climate_risk_index >= 47:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    confidence = confidence_from_scores(100.0 - drought_risk, 100.0 - flood_risk, 100.0 - heat_risk)

    recommendation = (
        "Activate climate mitigation plan: mulching, drainage trenches, and staggered irrigation scheduling"
        if risk_level != "Low"
        else "Continue regular resilience practices and monitor weekly climate updates"
    )

    explanation = (
        f"Climate engine assessed drought ({round(drought_risk, 1)}), heavy rainfall ({round(flood_risk, 1)}), "
        f"and heat stress ({round(heat_risk, 1)}) to estimate overall {risk_level.lower()} risk."
    )

    return module_envelope(
        key="climate-risk",
        title="AI Climate Risk Engine",
        result_label="Climate Risk",
        result_value=f"{risk_level} ({round(climate_risk_index, 1)} / 100)",
        confidence=confidence,
        recommendation=recommendation,
        explanation=explanation,
        chart_type="bar",
        chart_data=chart_points(
            ["Drought", "Heavy Rain", "Heat Stress", "Overall"],
            [drought_risk, flood_risk, heat_risk, climate_risk_index]
        ),
        metrics=[
            {"label": "Drought Risk", "value": f"{round(drought_risk, 1)}"},
            {"label": "Rainfall Risk", "value": f"{round(flood_risk, 1)}"},
            {"label": "Heat Stress", "value": f"{round(heat_risk, 1)}"}
        ],
        model_name="ClimateShield Multi-Risk",
        model_family="Gradient Boosting"
    )
