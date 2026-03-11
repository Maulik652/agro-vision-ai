from typing import Dict, List, Tuple

from .common import (
    CROP_PROFILES,
    chart_points,
    clamp,
    confidence_from_scores,
    environment_scores,
    module_envelope,
    soil_factor,
    normalize,
    safe_float
)


def _score_crop(crop_name: str, payload: Dict, scores: Dict) -> float:
    profile = CROP_PROFILES[crop_name]

    temp = safe_float(payload.get("temperature"), scores["temperature"], -10.0, 55.0)
    rainfall = safe_float(payload.get("rainfall"), scores["rainfall"], 0.0, 500.0)
    humidity = safe_float(payload.get("humidity"), scores["humidity"], 5.0, 100.0)
    soil_moisture = safe_float(payload.get("soilMoisture"), scores["soil_moisture"], 5.0, 100.0)

    temp_score = normalize(temp, profile["opt_temp"], 2.8 + (profile["heat_tolerance"] * 2.5))
    rainfall_suitability = normalize(rainfall, profile["opt_rainfall"], 10.0 + (profile["rain_tolerance"] * 14.0))
    humidity_score = normalize(humidity, profile["opt_humidity"], 8.0 + (profile["rain_tolerance"] * 8.0))
    moisture_score = normalize(soil_moisture, profile["opt_soil_moisture"], 7.0 + (profile["rain_tolerance"] * 7.0))

    base = (
        (temp_score * 0.3) +
        (rainfall_suitability * 0.24) +
        (humidity_score * 0.16) +
        (moisture_score * 0.2) +
        (scores["agro_score"] * 0.1)
    )

    soil_multiplier = soil_factor(payload.get("soilType", "loamy"))
    soil_suitability_multiplier = clamp(0.86 + (soil_multiplier * 0.14), 0.78, 1.05)
    temp_deviation_penalty = clamp(
        abs(temp - profile["opt_temp"]) * (1.25 - (profile["heat_tolerance"] * 0.45)),
        0.0,
        20.0
    )

    adjusted = clamp((base * soil_suitability_multiplier) - temp_deviation_penalty, 30.0, 99.0)

    return adjusted


def predict(payload: Dict) -> Dict:
    scores = environment_scores(payload)

    crop_scores: List[Tuple[str, float]] = []
    for crop_name in CROP_PROFILES:
        crop_scores.append((crop_name, _score_crop(crop_name, payload, scores)))

    ranked = sorted(crop_scores, key=lambda row: row[1], reverse=True)
    top_three = ranked[:3]

    confidence = confidence_from_scores(top_three[0][1], top_three[1][1], top_three[2][1])

    recommendation = (
        "Top recommendations align with rainfall suitability, soil conditions, and current temperature behavior."
    )

    explanation = (
        f"Top crops are ranked by climate fit, rainfall suitability, and soil-adjusted score: "
        f"{top_three[0][0]}, {top_three[1][0]}, {top_three[2][0]}."
    )

    chart_data = chart_points(
        [name for name, _ in top_three],
        [score for _, score in top_three]
    )

    return module_envelope(
        key="crop",
        title="AI Best Crop Recommendation",
        result_label="Top Recommended Crops",
        result_value=", ".join([name for name, _ in top_three]),
        confidence=confidence,
        recommendation=recommendation,
        explanation=explanation,
        chart_type="bar",
        chart_data=chart_data,
        metrics=[
            {"label": "1st Choice", "value": f"{top_three[0][0]} ({round(top_three[0][1], 1)})"},
            {"label": "2nd Choice", "value": f"{top_three[1][0]} ({round(top_three[1][1], 1)})"},
            {"label": "3rd Choice", "value": f"{top_three[2][0]} ({round(top_three[2][1], 1)})"}
        ],
        model_name="Crop Suitability Ranker",
        model_family="Deterministic Agronomy Model"
    )
