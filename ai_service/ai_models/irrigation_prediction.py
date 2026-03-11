from typing import Dict

from .common import (
    chart_points,
    confidence_from_scores,
    crop_profile,
    environment_scores,
    module_envelope,
    irrigation_factor,
    clamp
)


def predict(payload: Dict) -> Dict:
    profile = crop_profile(payload.get("cropType", ""))
    scores = environment_scores(payload)

    irrigation_efficiency = irrigation_factor(payload.get("irrigationMethod", "drip"))

    target_moisture = profile["opt_soil_moisture"]
    deficit = clamp(target_moisture - scores["soil_moisture"], -20.0, 30.0)

    rainfall_adjustment = clamp((scores["rainfall"] - profile["opt_rainfall"]) * -0.05, -4.0, 4.0)
    next_irrigation_days = clamp(round(2.5 + (deficit / 10.0) + rainfall_adjustment), 1.0, 7.0)

    base_water = profile["irrigation_mm"]
    water_needed = clamp(base_water + (deficit * 0.7) - (scores["rainfall"] * 0.08), 10.0, 46.0)
    water_needed = water_needed / max(irrigation_efficiency, 0.7)

    confidence = confidence_from_scores(
        scores["moisture_score"],
        scores["rain_score"],
        scores["humidity_score"]
    )

    moisture_projection = [
        clamp(scores["soil_moisture"] + 3.0, 20.0, 90.0),
        clamp(scores["soil_moisture"] + 1.0, 20.0, 90.0),
        clamp(scores["soil_moisture"] - 2.0, 20.0, 90.0),
        clamp(scores["soil_moisture"] - 4.0, 20.0, 90.0),
        clamp(scores["soil_moisture"] - 7.0, 20.0, 90.0)
    ]

    recommendation = (
        "Reduce irrigation cycle due to likely rainfall support"
        if scores["rainfall"] >= profile["opt_rainfall"]
        else "Maintain targeted drip pulse irrigation to avoid moisture stress"
    )

    explanation = (
        f"Soil moisture at {round(scores['soil_moisture'], 1)}% and forecast rainfall trend suggest next irrigation in "
        f"about {int(next_irrigation_days)} day(s)."
    )

    return module_envelope(
        key="irrigation",
        title="AI Smart Irrigation Advisor",
        result_label="Next Irrigation",
        result_value=f"{int(next_irrigation_days)} day(s) | {round(water_needed, 1)} mm water",
        confidence=confidence,
        recommendation=recommendation,
        explanation=explanation,
        chart_type="line",
        chart_data=chart_points(["Today", "Day 1", "Day 2", "Day 3", "Day 4"], moisture_projection),
        metrics=[
            {"label": "Water Needed", "value": f"{round(water_needed, 1)} mm"},
            {"label": "Soil Moisture", "value": f"{round(scores['soil_moisture'], 1)}%"},
            {"label": "Irrigation Method", "value": payload.get("irrigationMethod", "Drip").title()}
        ],
        model_name="Irrigation-RF Planner",
        model_family="Random Forest"
    )
