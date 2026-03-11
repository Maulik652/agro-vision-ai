from typing import Dict, Tuple

from .common import (
    calculate_heat_stress,
    calculate_humidity_stress,
    calculate_rainfall_stress,
    calculate_soil_moisture_stress,
    chart_points,
    clamp,
    confidence_from_scores,
    crop_profile,
    environment_scores,
    safe_float,
    module_envelope,
)

STRESS_WEIGHTS = {
    "temperature": 0.30,
    "humidity": 0.25,
    "soil_moisture": 0.25,
    "rainfall": 0.20
}


def _dominant_stress(stress_components: Dict[str, float]) -> Tuple[str, float]:
    ranked = sorted(stress_components.items(), key=lambda item: item[1], reverse=True)
    return ranked[0]


def predict(payload: Dict) -> Dict:
    profile = crop_profile(payload.get("cropType", ""))
    scores = environment_scores(payload)

    temperature = safe_float(payload.get("temperature"), scores["temperature"], -10.0, 55.0)
    humidity = safe_float(payload.get("humidity"), scores["humidity"], 5.0, 100.0)
    rainfall = safe_float(payload.get("rainfall"), scores["rainfall"], 0.0, 500.0)
    soil_moisture = safe_float(payload.get("soilMoisture"), scores["soil_moisture"], 5.0, 100.0)

    temperature_stress = calculate_heat_stress(temperature, profile["opt_temp"])
    humidity_stress = calculate_humidity_stress(humidity, profile["opt_humidity"])
    soil_moisture_stress = calculate_soil_moisture_stress(soil_moisture, profile["opt_soil_moisture"])
    rainfall_stress = calculate_rainfall_stress(rainfall, profile["opt_rainfall"])

    stress_components = {
        "Temperature": temperature_stress,
        "Humidity": humidity_stress,
        "Soil Moisture": soil_moisture_stress,
        "Rainfall": rainfall_stress
    }

    weighted_stress = (
        (temperature_stress * STRESS_WEIGHTS["temperature"]) +
        (humidity_stress * STRESS_WEIGHTS["humidity"]) +
        (soil_moisture_stress * STRESS_WEIGHTS["soil_moisture"]) +
        (rainfall_stress * STRESS_WEIGHTS["rainfall"])
    )

    health_index = clamp(100.0 - weighted_stress, 5.0, 98.0)
    health_risk_index = clamp(100.0 - health_index, 0.0, 100.0)

    if health_risk_index > 70.0:
        risk_level = "High"
    elif health_risk_index >= 40.0:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    confidence = confidence_from_scores(
        100.0 - temperature_stress,
        100.0 - humidity_stress,
        100.0 - soil_moisture_stress,
        100.0 - rainfall_stress,
        scores["agro_score"]
    )

    dominant_stress_name, dominant_stress_value = _dominant_stress(stress_components)

    future_risk = [
        clamp(health_risk_index * 0.92, 4.0, 96.0),
        clamp(health_risk_index * 0.98, 4.0, 96.0),
        clamp(health_risk_index, 4.0, 96.0),
        clamp(health_risk_index * 1.04, 4.0, 96.0),
        clamp(health_risk_index * 1.01, 4.0, 96.0)
    ]

    if risk_level == "High":
        recommendation = "Immediate corrective action needed: adjust irrigation, improve drainage, and apply stress-recovery nutrition"
    elif risk_level == "Medium":
        recommendation = "Reduce stress by balancing irrigation intervals and improving canopy airflow this week"
    else:
        recommendation = "Maintain current crop care routine with weekly monitoring"

    explanation = (
        f"Temperature {round(temperature, 1)} C, humidity {round(humidity, 1)}%, soil moisture {round(soil_moisture, 1)}%, "
        f"and rainfall {round(rainfall, 1)} mm indicate {risk_level.lower()} stress risk. "
        f"Dominant stress driver is {dominant_stress_name.lower()} ({round(dominant_stress_value, 1)}/100)."
    )

    return module_envelope(
        key="crop-health-risk",
        title="AI Crop Health Risk Prediction",
        result_label="Crop Health Risk",
        result_value=f"{risk_level} ({round(health_risk_index, 1)} / 100)",
        confidence=confidence,
        recommendation=recommendation,
        explanation=explanation,
        chart_type="line",
        chart_data=chart_points(["D1", "D2", "D3", "D4", "D5"], future_risk),
        metrics=[
            {"label": "Risk Index", "value": f"{round(health_risk_index, 1)} / 100"},
            {"label": "Agro Score", "value": f"{round(scores['agro_score'], 1)} / 100"},
            {"label": "Dominant Stress", "value": f"{dominant_stress_name} ({round(dominant_stress_value, 1)})"}
        ],
        model_name="CropHealth Stress Index",
        model_family="Deterministic Agronomy Model"
    )
