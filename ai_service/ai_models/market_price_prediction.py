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
    harvest_month = harvest_date.month if isinstance(harvest_date, date) else date.today().month

    seasonal_factor = month_seasonality(harvest_month)
    demand_factor = clamp(0.92 + (scores["rain_score"] / 400.0) + (scores["temp_score"] / 600.0), 0.85, 1.18)

    predicted_price = profile["market_base_price"] * seasonal_factor * demand_factor

    # Clamp within ±40% of the crop's own base price so predictions stay realistic
    price_floor = profile["market_base_price"] * 0.60
    price_ceiling = profile["market_base_price"] * 1.55
    predicted_price = round(clamp(predicted_price, price_floor, price_ceiling), 0)

    confidence = confidence_from_scores(
        scores["temp_score"],
        scores["rain_score"],
        100.0 - abs(90.0 - scores["agro_score"])
    )

    price_projection = [
        predicted_price * 0.93,
        predicted_price * 0.97,
        predicted_price,
        predicted_price * 1.04,
        predicted_price * 1.06,
        predicted_price * 1.02
    ]

    best_window = "2-3 weeks after harvest" if seasonal_factor >= 1.0 else "within 7-10 days after harvest"

    recommendation = f"Plan market sale {best_window} to improve realization"
    explanation = (
        f"Seasonality trend and demand forecast indicate expected market price near Rs {int(predicted_price)} per quintal."
    )

    return module_envelope(
        key="market",
        title="AI Market Price Prediction",
        result_label="Predicted Market Price",
        result_value=f"Rs {int(predicted_price)} per quintal",
        confidence=confidence,
        recommendation=recommendation,
        explanation=explanation,
        chart_type="line",
        chart_data=chart_points(["W1", "W2", "W3", "W4", "W5", "W6"], price_projection),
        metrics=[
            {"label": "Predicted Price", "value": f"Rs {int(predicted_price)}/q"},
            {"label": "Best Selling Time", "value": best_window},
            {"label": "Seasonality", "value": f"x{round(seasonal_factor, 2)}"}
        ],
        model_name="MarketPulse-TSF",
        model_family="Time Series Forecasting"
    )
