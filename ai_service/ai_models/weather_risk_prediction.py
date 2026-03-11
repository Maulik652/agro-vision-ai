import math
from datetime import date
from typing import Dict

from .common import (
    calculate_heat_stress,
    calculate_humidity_stress,
    calculate_rainfall_stress,
    chart_points,
    clamp,
    confidence_from_scores,
    crop_profile,
    environment_scores,
    module_envelope,
    month_seasonality,
    parse_date,
    safe_float
)


def predict(payload: Dict) -> Dict:
    profile = crop_profile(payload.get("cropType", ""))
    scores = environment_scores(payload)

    harvest_date = parse_date(payload.get("expectedHarvestDate", ""))
    month = harvest_date.month if isinstance(harvest_date, date) else date.today().month
    seasonal = month_seasonality(month)

    temperature = safe_float(payload.get("temperature"), scores["temperature"], -10.0, 55.0)
    rainfall = safe_float(payload.get("rainfall"), scores["rainfall"], 0.0, 500.0)
    humidity = safe_float(payload.get("humidity"), scores["humidity"], 5.0, 100.0)

    heat_risk = calculate_heat_stress(temperature, profile["opt_temp"])
    rainfall_stress = calculate_rainfall_stress(rainfall, profile["opt_rainfall"])
    excess_rainfall_risk = clamp(
        ((rainfall - profile["opt_rainfall"]) / max(profile["opt_rainfall"], 1.0)) * 120.0,
        0.0,
        100.0
    )
    rain_risk = clamp((rainfall_stress * 0.6) + (excess_rainfall_risk * 0.4), 0.0, 100.0)

    humidity_base_stress = calculate_humidity_stress(humidity, profile["opt_humidity"])
    humidity_risk = clamp((max(0.0, humidity - 68.0) * 2.1) + (humidity_base_stress * 0.35), 0.0, 100.0)

    weather_risk = clamp(
        (heat_risk * 0.30) +
        (rain_risk * 0.40) +
        (humidity_risk * 0.30) +
        ((seasonal - 1.0) * 25.0),
        0.0,
        100.0
    )

    if weather_risk > 70.0:
        risk_level = "High"
    elif weather_risk >= 40.0:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    threats = []
    if heat_risk >= 60.0:
        threats.append("Heat Stress")
    if excess_rainfall_risk >= 55.0:
        threats.append("Heavy Rainfall")
    if humidity_risk >= 55.0:
        threats.append("Disease-Conducive Humidity")

    if not threats:
        threats.append("No severe immediate threats")

    confidence = confidence_from_scores(
        100.0 - heat_risk,
        100.0 - rain_risk,
        100.0 - humidity_risk,
        scores["agro_score"]
    )

    daily_risk = []
    for day_index in range(7):
        seasonal_wave = math.sin((month + day_index + 1) * 0.9) * 2.8
        micro_wave = math.cos((day_index + 2) * 1.4) * 1.9
        drift = (day_index - 3) * 0.35
        day_value = clamp(weather_risk + seasonal_wave + micro_wave + drift, 0.0, 100.0)
        daily_risk.append(day_value)

    chart = chart_points(
        ["D1", "D2", "D3", "D4", "D5", "D6", "D7"],
        daily_risk
    )

    recommendation = (
        "Advance harvest planning by 2-3 days and ensure drainage readiness"
        if risk_level != "Low"
        else "Keep current weather watch and maintain normal field schedule"
    )

    explanation = (
        f"Heat stress {round(heat_risk, 1)}, rainfall risk {round(rain_risk, 1)}, and humidity disease risk {round(humidity_risk, 1)} "
        f"combine to a {risk_level.lower()} weather risk profile. Key threat(s): {', '.join(threats)}."
    )

    return module_envelope(
        key="weather",
        title="AI Weather Risk Prediction",
        result_label="Weather Risk Score",
        result_value=f"{risk_level} ({round(weather_risk, 1)} / 100)",
        confidence=confidence,
        recommendation=recommendation,
        explanation=explanation,
        chart_type="area",
        chart_data=chart,
        metrics=[
            {"label": "Heat Stress", "value": f"{round(heat_risk, 1)} / 100"},
            {"label": "Excess Rainfall Risk", "value": f"{round(excess_rainfall_risk, 1)} / 100"},
            {"label": "Humidity Disease Risk", "value": f"{round(humidity_risk, 1)} / 100"}
        ],
        model_name="Weather Stress Composite",
        model_family="Deterministic Agronomy Model"
    )
