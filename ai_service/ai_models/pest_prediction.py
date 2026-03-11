from typing import Dict

from .common import (
    calculate_heat_stress,
    calculate_rainfall_stress,
    chart_points,
    clamp,
    confidence_from_scores,
    crop_profile,
    environment_scores,
    likely_pest,
    module_envelope,
    safe_float
)


def predict(payload: Dict) -> Dict:
    profile = crop_profile(payload.get("cropType", ""))
    scores = environment_scores(payload)

    humidity = safe_float(payload.get("humidity"), scores["humidity"], 5.0, 100.0)
    temperature = safe_float(payload.get("temperature"), scores["temperature"], -10.0, 55.0)
    rainfall = safe_float(payload.get("rainfall"), scores["rainfall"], 0.0, 500.0)
    soil_moisture = safe_float(payload.get("soilMoisture"), scores["soil_moisture"], 5.0, 100.0)

    humidity_pressure = clamp(((humidity - 52.0) / 48.0) * 100.0, 0.0, 100.0)
    temperature_deviation = calculate_heat_stress(temperature, profile["opt_temp"])
    moisture_pressure = clamp(
        (abs(soil_moisture - profile["opt_soil_moisture"]) / max(profile["opt_soil_moisture"], 1.0)) * 95.0,
        0.0,
        100.0
    )

    rainfall_stress = calculate_rainfall_stress(rainfall, profile["opt_rainfall"])
    rainfall_excess_pressure = clamp(
        ((rainfall - profile["opt_rainfall"]) / max(profile["opt_rainfall"], 1.0)) * 120.0,
        0.0,
        100.0
    )
    rainfall_pressure = clamp((rainfall_stress * 0.45) + (rainfall_excess_pressure * 0.55), 0.0, 100.0)

    crop_pest_sensitivity = clamp(profile.get("pest_sensitivity", 1.0) * 100.0, 70.0, 120.0)

    risk_index = clamp(
        8.0 +
        (humidity_pressure * 0.30) +
        (temperature_deviation * 0.23) +
        (moisture_pressure * 0.22) +
        (rainfall_pressure * 0.25) +
        ((crop_pest_sensitivity - 100.0) * 0.35),
        0.0,
        100.0
    )

    if risk_index > 70.0:
        risk_level = "High"
    elif risk_index >= 40.0:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    pest_name = likely_pest(payload.get("cropType", ""), humidity=humidity, temperature=temperature)

    confidence = confidence_from_scores(
        100.0 - temperature_deviation,
        100.0 - moisture_pressure,
        100.0 - rainfall_pressure,
        clamp(100.0 - abs(humidity - profile["opt_humidity"]) * 1.8, 0.0, 100.0)
    )

    trend = [
        clamp(risk_index * 0.93, 3.0, 97.0),
        clamp(risk_index * 0.98, 3.0, 97.0),
        clamp(risk_index, 3.0, 97.0),
        clamp(risk_index * 1.05, 3.0, 97.0),
        clamp(risk_index * 1.01, 3.0, 97.0)
    ]

    recommendation = (
        f"Intensify scouting and preventive protection for {pest_name}; inspect canopy every 2 days"
        if risk_level == "High"
        else f"Monitor pest hotspots and prepare targeted control for {pest_name}" if risk_level == "Medium"
        else "Continue preventive scouting and maintain sticky trap monitoring"
    )

    explanation = (
        f"Humidity {round(humidity, 1)}%, temperature {round(temperature, 1)} C, rainfall {round(rainfall, 1)} mm, "
        f"and soil moisture {round(soil_moisture, 1)}% indicate {risk_level.lower()} pest pressure for current crop conditions."
    )

    return module_envelope(
        key="pest",
        title="AI Pest Outbreak Prediction",
        result_label="Pest Risk",
        result_value=f"{risk_level} | Likely Pest: {pest_name}",
        confidence=confidence,
        recommendation=recommendation,
        explanation=explanation,
        chart_type="line",
        chart_data=chart_points(["W1", "W2", "W3", "W4", "W5"], trend),
        metrics=[
            {"label": "Risk Level", "value": risk_level},
            {"label": "Likely Pest", "value": pest_name},
            {"label": "Risk Index", "value": f"{round(risk_index, 1)} / 100"}
        ],
        model_name="Pest Pressure Index",
        model_family="Deterministic Agronomy Model"
    )
