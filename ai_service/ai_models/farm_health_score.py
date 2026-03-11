from typing import Dict

from .common import (
    chart_points,
    confidence_from_scores,
    crop_profile,
    environment_scores,
    module_envelope,
    soil_factor,
    irrigation_factor,
    clamp
)


def predict(payload: Dict) -> Dict:
    profile = crop_profile(payload.get("cropType", ""))
    scores = environment_scores(payload)

    soil_component = clamp(soil_factor(payload.get("soilType", "loamy")) * 100.0, 55.0, 100.0)
    irrigation_component = clamp(irrigation_factor(payload.get("irrigationMethod", "drip")) * 100.0, 50.0, 100.0)
    weather_component = clamp((scores["temp_score"] + scores["rain_score"] + scores["humidity_score"]) / 3.0, 30.0, 100.0)
    moisture_component = clamp(scores["moisture_score"], 30.0, 100.0)

    health_score = clamp(
        (soil_component * 0.25) +
        (irrigation_component * 0.2) +
        (weather_component * 0.3) +
        (moisture_component * 0.25),
        25.0,
        99.0
    )

    confidence = confidence_from_scores(soil_component, irrigation_component, weather_component, moisture_component)

    recommendation = (
        "Maintain preventive agronomy schedule and recheck moisture every 3 days"
        if health_score >= 78
        else "Improve soil nutrition balance and tighten irrigation management for recovery"
    )

    explanation = (
        f"Farm health combines soil condition, crop weather fit, irrigation efficiency, and moisture status to score {round(health_score, 1)}/100."
    )

    factors = [
        ("Soil Condition", soil_component),
        ("Irrigation", irrigation_component),
        ("Weather Fit", weather_component),
        ("Soil Moisture", moisture_component)
    ]

    return module_envelope(
        key="farm-health",
        title="AI Farm Health Score",
        result_label="Farm Health Score",
        result_value=f"{round(health_score, 1)} / 100",
        confidence=confidence,
        recommendation=recommendation,
        explanation=explanation,
        chart_type="bar",
        chart_data=chart_points([label for label, _ in factors], [value for _, value in factors]),
        metrics=[
            {"label": "Soil", "value": f"{round(soil_component, 1)}"},
            {"label": "Weather", "value": f"{round(weather_component, 1)}"},
            {"label": "Moisture", "value": f"{round(moisture_component, 1)}"}
        ],
        model_name="FarmVitality Composite Engine",
        model_family="Hybrid Scoring"
    )
