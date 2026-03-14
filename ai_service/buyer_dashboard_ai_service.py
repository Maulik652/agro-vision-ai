"""
Buyer Dashboard AI microservice.

Architecture decisions:
- Models are trained in-memory at startup using synthetic-but-structured data so the
  service is immediately usable in development environments.
- XGBoost is preferred for price prediction; if unavailable, a gradient boosting fallback
  keeps the API contract stable.
- RandomForest is used for demand forecasting to provide robust non-linear estimates
  with low tuning overhead.
"""

from __future__ import annotations

from typing import List

import numpy as np
from fastapi import FastAPI, Query
from pydantic import BaseModel, Field
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except Exception:
    HAS_XGBOOST = False
    XGBRegressor = None


app = FastAPI(title="AgroVision Buyer Dashboard AI", version="1.0.0")


def _to_float(value: float | int | str, fallback: float = 0.0) -> float:
    try:
        parsed = float(value)
        if np.isfinite(parsed):
            return parsed
    except Exception:
        pass

    return float(fallback)


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def _text_feature(value: str) -> float:
    text = str(value or "").strip().lower()
    if not text:
        return 0.0

    hashed = sum((index + 1) * ord(char) for index, char in enumerate(text))
    return (hashed % 997) / 997.0


def _history_array(history: List[float]) -> np.ndarray:
    if not history:
        return np.array([], dtype=float)

    values = [_to_float(item, np.nan) for item in history]
    filtered = [value for value in values if np.isfinite(value)]
    return np.array(filtered, dtype=float)


def _volatility_score(history: np.ndarray) -> float:
    if history.size == 0:
        return 32.0

    mean = max(float(np.mean(history)), 1.0)
    score = (float(np.std(history)) / mean) * 100.0
    return _clamp(score, 5.0, 95.0)


def _history_features(history: np.ndarray) -> tuple[float, float, float]:
    if history.size == 0:
        return 25.0, 0.0, 2.0

    mean = float(np.mean(history))
    trend = float((history[-1] - history[0]) / max(history[0], 1.0)) if history.size > 1 else 0.0
    std = float(np.std(history))
    return mean, trend, std


def _build_training_data(seed: int = 42, samples: int = 1400):
    rng = np.random.default_rng(seed)

    crop_code = rng.uniform(0.0, 1.0, samples)
    location_code = rng.uniform(0.0, 1.0, samples)
    horizon = rng.integers(7, 91, samples) / 90.0
    hist_mean = rng.uniform(12, 95, samples)
    hist_trend = rng.normal(0.0, 0.26, samples)
    hist_std = rng.uniform(0.4, 16.0, samples)
    demand_hint = rng.uniform(15, 95, samples) / 100.0

    price_noise = rng.normal(0.0, 2.2, samples)
    demand_noise = rng.normal(0.0, 3.0, samples)

    price_target = (
        hist_mean * (1.0 + hist_trend * 0.24)
        + (crop_code * 18.0)
        + (location_code * 8.5)
        + (hist_std * 0.45)
        + (demand_hint * 12.0)
        + (horizon * 3.0)
        + price_noise
    )

    demand_target = (
        42.0
        + (crop_code * 18.0)
        + (location_code * 9.0)
        + (hist_trend * 22.0)
        - (hist_std * 0.9)
        + (horizon * 8.0)
        + demand_noise
    )

    X = np.column_stack([
        crop_code,
        location_code,
        horizon,
        hist_mean / 120.0,
        hist_trend,
        hist_std / 30.0,
        demand_hint,
    ])

    y_price = np.clip(price_target, 3.0, 180.0)
    y_demand = np.clip(demand_target, 5.0, 100.0)

    return X, y_price, y_demand


def train_example_models(seed: int = 42):
    X, y_price, y_demand = _build_training_data(seed=seed)

    if HAS_XGBOOST:
        price_model = XGBRegressor(
            n_estimators=180,
            max_depth=4,
            learning_rate=0.07,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=seed,
        )
    else:
        price_model = GradientBoostingRegressor(random_state=seed)

    demand_model = RandomForestRegressor(
        n_estimators=240,
        max_depth=12,
        min_samples_leaf=2,
        random_state=seed,
    )

    price_model.fit(X, y_price)
    demand_model.fit(X, y_demand)

    return {
        "price": price_model,
        "demand": demand_model,
    }


MODELS = train_example_models()


BASE_CROP_PRICES = {
    "wheat": 28.0,
    "rice": 32.0,
    "maize": 24.0,
    "tomato": 22.0,
    "onion": 19.0,
    "potato": 16.0,
    "soybean": 45.0,
    "cotton": 68.0,
    "groundnut": 54.0,
    "chilli": 96.0,
    "sugarcane": 4.0,
}


class PricePredictionRequest(BaseModel):
    crop: str = Field(..., min_length=2, max_length=80)
    location: str = Field(default="market", min_length=2, max_length=80)
    days: int = Field(default=30, ge=7, le=90)
    price_history: List[float] = Field(default_factory=list)
    demand_score: float = Field(default=55.0, ge=0, le=100)


class DemandForecastRequest(BaseModel):
    crop: str = Field(..., min_length=2, max_length=80)
    location: str = Field(default="market", min_length=2, max_length=80)
    days: int = Field(default=30, ge=7, le=90)
    price_history: List[float] = Field(default_factory=list)


class CropCandidate(BaseModel):
    crop: str = Field(..., min_length=2, max_length=80)
    avg_price: float = Field(default=25.0, ge=0)
    availability: float = Field(default=0.0, ge=0)
    listing_count: int = Field(default=0, ge=0)


class RecommendCropsRequest(BaseModel):
    location: str = Field(default="market", min_length=2, max_length=80)
    crops: List[CropCandidate] = Field(default_factory=list)


class AIResponse(BaseModel):
    predicted_price: float
    demand_score: float
    volatility_score: float
    model: str


def _base_price(crop: str) -> float:
    return float(BASE_CROP_PRICES.get(str(crop or "").strip().lower(), 25.0))


def _history_from_csv(raw: str) -> np.ndarray:
    text = str(raw or "").strip()
    if not text:
        return np.array([], dtype=float)

    values = [_to_float(chunk.strip(), np.nan) for chunk in text.split(",")]
    filtered = [item for item in values if np.isfinite(item) and item > 0]
    return np.array(filtered, dtype=float)


def _build_feature_vector(
    crop: str,
    location: str,
    days: int,
    history: np.ndarray,
    demand_hint: float,
) -> np.ndarray:
    mean, trend, std = _history_features(history)

    return np.array([
        [
            _text_feature(crop),
            _text_feature(location),
            _to_float(days) / 90.0,
            mean / 120.0,
            trend,
            std / 30.0,
            _clamp(demand_hint / 100.0, 0.0, 1.0),
        ]
    ], dtype=float)


def _predict_demand(crop: str, location: str, days: int, history: np.ndarray) -> float:
    feature = _build_feature_vector(crop, location, days, history, demand_hint=55.0)
    predicted = float(MODELS["demand"].predict(feature)[0])
    return float(_clamp(predicted, 5.0, 100.0))


def _predict_price(crop: str, location: str, days: int, history: np.ndarray, demand_score: float) -> float:
    feature = _build_feature_vector(crop, location, days, history, demand_hint=demand_score)
    predicted = float(MODELS["price"].predict(feature)[0])
    return float(_clamp(predicted, 3.0, 220.0))


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "price_model": "xgboost" if HAS_XGBOOST else "gradient_boosting",
        "demand_model": "random_forest",
    }


@app.post("/ai/price-prediction", response_model=AIResponse)
def price_prediction(payload: PricePredictionRequest):
    history = _history_array(payload.price_history)

    demand_score = _clamp(payload.demand_score, 5.0, 100.0)
    predicted_price = _predict_price(
        crop=payload.crop,
        location=payload.location,
        days=payload.days,
        history=history,
        demand_score=demand_score,
    )

    volatility_score = _volatility_score(history)

    return AIResponse(
        predicted_price=round(predicted_price, 2),
        demand_score=round(demand_score, 1),
        volatility_score=round(volatility_score, 1),
        model="xgboost" if HAS_XGBOOST else "gradient_boosting",
    )


@app.post("/ai/demand-forecast", response_model=AIResponse)
def demand_forecast(payload: DemandForecastRequest):
    history = _history_array(payload.price_history)

    demand_score = _predict_demand(
        crop=payload.crop,
        location=payload.location,
        days=payload.days,
        history=history,
    )

    predicted_price = _predict_price(
        crop=payload.crop,
        location=payload.location,
        days=payload.days,
        history=history,
        demand_score=demand_score,
    )

    volatility_score = _volatility_score(history)

    return AIResponse(
        predicted_price=round(predicted_price, 2),
        demand_score=round(demand_score, 1),
        volatility_score=round(volatility_score, 1),
        model="random_forest",
    )


@app.post("/ai/recommend-crops")
def recommend_crops(payload: RecommendCropsRequest):
    recommendations = []

    for crop in payload.crops:
        synthetic_history = np.array(
            [
                crop.avg_price * 0.95,
                crop.avg_price,
                crop.avg_price * 1.03,
                crop.avg_price * 1.01,
                crop.avg_price * 0.98,
            ],
            dtype=float,
        )

        demand_score = _predict_demand(
            crop=crop.crop,
            location=payload.location,
            days=30,
            history=synthetic_history,
        )

        predicted_price = _predict_price(
            crop=crop.crop,
            location=payload.location,
            days=30,
            history=synthetic_history,
            demand_score=demand_score,
        )

        volatility_score = _volatility_score(synthetic_history)
        availability_factor = np.log1p(max(crop.availability, 0.0))

        ranking_score = demand_score - (volatility_score * 0.22) + (availability_factor * 2.6)

        recommendations.append(
            {
                "crop_name": crop.crop,
                "predicted_price": round(predicted_price, 2),
                "demand_score": round(demand_score, 1),
                "volatility_score": round(volatility_score, 1),
                "risk_indicator": (
                    "High Risk"
                    if volatility_score >= 68
                    else "Low Risk"
                    if volatility_score <= 35
                    else "Medium Risk"
                ),
                "ranking_score": round(float(ranking_score), 2),
                "model": "xgboost+random_forest" if HAS_XGBOOST else "gradient_boosting+random_forest",
            }
        )

    recommendations.sort(key=lambda item: item["ranking_score"], reverse=True)

    return {
        "recommendations": recommendations
    }


@app.get("/ai/crop-insight/{crop_id}")
def crop_insight(
    crop_id: str,
    crop: str = Query(default="Wheat", min_length=2, max_length=80),
    location: str = Query(default="market", min_length=2, max_length=80),
    current_price: float | None = Query(default=None, ge=0),
    price_history: str = Query(default=""),
):
    parsed_history = _history_from_csv(price_history)
    base_price = _base_price(crop)

    if current_price is None or not np.isfinite(current_price) or current_price <= 0:
        current_price = float(np.mean(parsed_history)) if parsed_history.size else base_price

    if parsed_history.size:
        history = parsed_history
    else:
        history = np.array(
            [
                current_price * 0.96,
                current_price * 1.01,
                current_price * 1.03,
                current_price * 0.99,
                current_price,
            ],
            dtype=float,
        )

    demand_score = _predict_demand(
        crop=crop,
        location=location,
        days=30,
        history=history,
    )

    predicted_price = _predict_price(
        crop=crop,
        location=location,
        days=30,
        history=history,
        demand_score=demand_score,
    )

    volatility_index = _clamp(_volatility_score(history) / 100.0, 0.05, 0.95)
    confidence_score = _clamp(
        0.62 + min(history.size, 7) * 0.03 + (0.08 if HAS_XGBOOST else 0.04),
        0.55,
        0.96,
    )

    return {
        "crop_id": crop_id,
        "current_price": round(float(current_price), 2),
        "predicted_price": round(float(predicted_price), 2),
        "demand_score": round(float(demand_score) / 100.0, 2),
        "volatility_index": round(float(volatility_index), 2),
        "confidence_score": round(float(confidence_score), 2),
        "model": "xgboost+random_forest" if HAS_XGBOOST else "gradient_boosting+random_forest",
    }
