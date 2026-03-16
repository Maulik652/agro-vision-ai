"""
Analytics Prediction Service — AgroVision AI
Stacked ensemble: XGBoost + RandomForest → Ridge meta-learner.
14 features, 5000 training samples, seasonal + MSP + supply shock signals.

Run:
    uvicorn analytics_prediction_service:app --host 0.0.0.0 --port 8001 --reload
"""
from __future__ import annotations
from typing import List, Optional
import math
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBRegressor
    HAS_XGB = True
except Exception:
    HAS_XGB = False

app = FastAPI(title="AgroVision Analytics Prediction Service", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Crop base data (MSP-anchored Indian market prices ₹/kg) ──────────────────
CROP_BASE = {
    "wheat":      {"msp": 21.5, "seasonal_peak": [11,12,1,2],  "harvest": [3,4],    "base": 28.0},
    "rice":       {"msp": 20.7, "seasonal_peak": [7,8,9],      "harvest": [10,11],  "base": 32.0},
    "maize":      {"msp": 18.5, "seasonal_peak": [6,7,8],      "harvest": [9,10],   "base": 24.0},
    "tomato":     {"msp": 0.0,  "seasonal_peak": [11,12,1],    "harvest": [2,3],    "base": 22.0},
    "onion":      {"msp": 0.0,  "seasonal_peak": [5,6,7],      "harvest": [11,12],  "base": 19.0},
    "potato":     {"msp": 0.0,  "seasonal_peak": [4,5,6],      "harvest": [1,2,3],  "base": 16.0},
    "soybean":    {"msp": 46.0, "seasonal_peak": [9,10,11],    "harvest": [10,11],  "base": 45.0},
    "cotton":     {"msp": 66.0, "seasonal_peak": [10,11,12],   "harvest": [10,11],  "base": 68.0},
    "groundnut":  {"msp": 55.0, "seasonal_peak": [10,11,12],   "harvest": [11,12],  "base": 54.0},
    "chilli":     {"msp": 0.0,  "seasonal_peak": [1,2,3],      "harvest": [2,3,4],  "base": 96.0},
    "sugarcane":  {"msp": 3.15, "seasonal_peak": [11,12,1,2],  "harvest": [11,12],  "base": 4.0},
    "mustard":    {"msp": 52.5, "seasonal_peak": [12,1,2],     "harvest": [3,4],    "base": 55.0},
    "turmeric":   {"msp": 0.0,  "seasonal_peak": [1,2,3],      "harvest": [2,3],    "base": 85.0},
    "garlic":     {"msp": 0.0,  "seasonal_peak": [4,5,6],      "harvest": [3,4],    "base": 45.0},
}

# ── Feature engineering helpers ──────────────────────────────────────────────
def _crop_code(crop: str) -> float:
    text = str(crop or "").strip().lower()
    h = sum((i + 1) * ord(c) for i, c in enumerate(text))
    return (h % 997) / 997.0

def _location_code(loc: str) -> float:
    text = str(loc or "").strip().lower()
    h = sum((i + 1) * ord(c) for i, c in enumerate(text))
    return (h % 883) / 883.0

def _seasonal_factor(crop: str, month: int) -> float:
    info = CROP_BASE.get(crop.lower(), {})
    peak = info.get("seasonal_peak", [])
    harvest = info.get("harvest", [])
    if month in peak:
        return 1.0
    if month in harvest:
        return -0.5
    return 0.0

def _msp_ratio(crop: str, price: float) -> float:
    info = CROP_BASE.get(crop.lower(), {})
    msp = info.get("msp", 0.0)
    if msp <= 0 or price <= 0:
        return 0.0
    return min((price - msp) / max(msp, 1.0), 2.0)

def _history_stats(history: List[float]):
    arr = np.array([v for v in history if math.isfinite(v) and v > 0], dtype=float)
    if arr.size == 0:
        return 25.0, 0.0, 2.0, 0.0
    mean = float(np.mean(arr))
    trend = float((arr[-1] - arr[0]) / max(arr[0], 1.0)) if arr.size > 1 else 0.0
    std = float(np.std(arr))
    momentum = float(np.mean(np.diff(arr))) if arr.size > 1 else 0.0
    return mean, trend, std, momentum

def _volatility(history: List[float]) -> float:
    arr = np.array([v for v in history if math.isfinite(v) and v > 0], dtype=float)
    if arr.size < 2:
        return 30.0
    cv = float(np.std(arr) / max(np.mean(arr), 1.0)) * 100.0
    return float(np.clip(cv, 5.0, 95.0))

def _build_features(
    crop: str, location: str, month: int, days: int,
    history: List[float], demand_hint: float, supply_shock: float,
    rainfall_idx: float, qty_purchased: float,
) -> np.ndarray:
    mean, trend, std, momentum = _history_stats(history)
    current_price = history[-1] if history else mean
    return np.array([[
        _crop_code(crop),                          # 0  crop identity
        _location_code(location),                  # 1  location
        days / 90.0,                               # 2  forecast horizon
        mean / 120.0,                              # 3  normalised mean price
        trend,                                     # 4  price trend
        std / 30.0,                                # 5  price std
        momentum / 10.0,                           # 6  price momentum
        np.clip(demand_hint / 100.0, 0.0, 1.0),   # 7  demand hint
        _seasonal_factor(crop, month),             # 8  seasonal signal
        _msp_ratio(crop, current_price),           # 9  MSP premium
        np.clip(supply_shock, -1.0, 1.0),          # 10 supply shock (-1=surplus, +1=shortage)
        np.clip(rainfall_idx, 0.0, 1.0),           # 11 rainfall index
        np.log1p(max(qty_purchased, 0.0)) / 10.0, # 12 buyer quantity signal
        (month - 1) / 11.0,                        # 13 month encoding
    ]], dtype=float)

# ── Training data generation (5000 samples, 14 features) ─────────────────────
def _generate_training_data(seed: int = 42, n: int = 5000):
    rng = np.random.default_rng(seed)
    crop_code     = rng.uniform(0.0, 1.0, n)
    loc_code      = rng.uniform(0.0, 1.0, n)
    horizon       = rng.integers(7, 91, n) / 90.0
    hist_mean     = rng.uniform(10, 110, n)
    hist_trend    = rng.normal(0.0, 0.3, n)
    hist_std      = rng.uniform(0.3, 18.0, n)
    momentum      = rng.normal(0.0, 1.5, n) / 10.0
    demand        = rng.uniform(10, 95, n) / 100.0
    seasonal      = rng.choice([-0.5, 0.0, 1.0], n, p=[0.2, 0.5, 0.3])
    msp_ratio     = rng.uniform(-0.1, 1.5, n)
    supply_shock  = rng.normal(0.0, 0.3, n)
    rainfall      = rng.uniform(0.0, 1.0, n)
    qty_signal    = rng.uniform(0.0, 3.0, n)
    month_enc     = rng.uniform(0.0, 1.0, n)

    price_noise  = rng.normal(0.0, 1.8, n)
    demand_noise = rng.normal(0.0, 2.5, n)

    # Price target — anchored to mean with seasonal, demand, supply, MSP signals
    price_target = (
        hist_mean * (1.0 + hist_trend * 0.28 + momentum * 0.15)
        + crop_code * 20.0
        + loc_code * 9.0
        + hist_std * 0.4
        + demand * 14.0
        + seasonal * hist_mean * 0.12
        + msp_ratio * 8.0
        - supply_shock * hist_mean * 0.08
        + rainfall * 3.0
        + horizon * 4.0
        + price_noise
    )

    # Demand target
    demand_target = (
        45.0
        + crop_code * 20.0
        + loc_code * 10.0
        + hist_trend * 25.0
        + momentum * 8.0
        - hist_std * 0.8
        + seasonal * 12.0
        + rainfall * 6.0
        - supply_shock * 10.0
        + horizon * 7.0
        + demand_noise
    )

    X = np.column_stack([
        crop_code, loc_code, horizon, hist_mean / 120.0, hist_trend,
        hist_std / 30.0, momentum, demand, seasonal, msp_ratio,
        supply_shock, rainfall, qty_signal, month_enc,
    ])
    y_price  = np.clip(price_target, 3.0, 250.0)
    y_demand = np.clip(demand_target, 5.0, 100.0)
    return X, y_price, y_demand


# ── Stacked ensemble training ─────────────────────────────────────────────────
def _train_stacked_ensemble(seed: int = 42):
    X, y_price, y_demand = _generate_training_data(seed=seed)
    split = int(len(X) * 0.8)
    X_tr, X_val = X[:split], X[split:]
    yp_tr, yp_val = y_price[:split], y_price[split:]
    yd_tr, yd_val = y_demand[:split], y_demand[split:]

    # Base learners — price
    if HAS_XGB:
        xgb_price = XGBRegressor(
            n_estimators=300, max_depth=5, learning_rate=0.06,
            subsample=0.85, colsample_bytree=0.85,
            min_child_weight=3, reg_alpha=0.1, reg_lambda=1.0,
            objective="reg:squarederror", random_state=seed,
        )
    else:
        xgb_price = GradientBoostingRegressor(
            n_estimators=300, max_depth=5, learning_rate=0.06,
            subsample=0.85, random_state=seed,
        )

    rf_price = RandomForestRegressor(
        n_estimators=300, max_depth=14, min_samples_leaf=2,
        max_features=0.7, random_state=seed,
    )

    # Base learners — demand
    if HAS_XGB:
        xgb_demand = XGBRegressor(
            n_estimators=250, max_depth=5, learning_rate=0.07,
            subsample=0.85, colsample_bytree=0.85,
            objective="reg:squarederror", random_state=seed + 1,
        )
    else:
        xgb_demand = GradientBoostingRegressor(
            n_estimators=250, max_depth=5, learning_rate=0.07,
            subsample=0.85, random_state=seed + 1,
        )

    rf_demand = RandomForestRegressor(
        n_estimators=300, max_depth=14, min_samples_leaf=2,
        max_features=0.7, random_state=seed + 2,
    )

    xgb_price.fit(X_tr, yp_tr)
    rf_price.fit(X_tr, yp_tr)
    xgb_demand.fit(X_tr, yd_tr)
    rf_demand.fit(X_tr, yd_tr)

    # Meta-learner (Ridge) on validation OOF predictions
    meta_price_X  = np.column_stack([xgb_price.predict(X_val),  rf_price.predict(X_val)])
    meta_demand_X = np.column_stack([xgb_demand.predict(X_val), rf_demand.predict(X_val)])

    scaler_p = StandardScaler().fit(meta_price_X)
    scaler_d = StandardScaler().fit(meta_demand_X)

    meta_price  = Ridge(alpha=1.0).fit(scaler_p.transform(meta_price_X),  yp_val)
    meta_demand = Ridge(alpha=1.0).fit(scaler_d.transform(meta_demand_X), yd_val)

    return {
        "xgb_price": xgb_price, "rf_price": rf_price,
        "xgb_demand": xgb_demand, "rf_demand": rf_demand,
        "meta_price": meta_price, "meta_demand": meta_demand,
        "scaler_p": scaler_p, "scaler_d": scaler_d,
    }


print("Training stacked ensemble models...")
ENSEMBLE = _train_stacked_ensemble()
print("Models ready.")


# ── Prediction helpers ────────────────────────────────────────────────────────
def _predict(
    crop: str, location: str, month: int, days: int,
    history: List[float], demand_hint: float,
    supply_shock: float = 0.0, rainfall_idx: float = 0.5,
    qty_purchased: float = 0.0,
) -> dict:
    X = _build_features(crop, location, month, days, history, demand_hint, supply_shock, rainfall_idx, qty_purchased)

    # Price ensemble
    p1 = float(ENSEMBLE["xgb_price"].predict(X)[0])
    p2 = float(ENSEMBLE["rf_price"].predict(X)[0])
    meta_p = ENSEMBLE["scaler_p"].transform([[p1, p2]])
    price = float(np.clip(ENSEMBLE["meta_price"].predict(meta_p)[0], 3.0, 300.0))

    # Demand ensemble
    d1 = float(ENSEMBLE["xgb_demand"].predict(X)[0])
    d2 = float(ENSEMBLE["rf_demand"].predict(X)[0])
    meta_d = ENSEMBLE["scaler_d"].transform([[d1, d2]])
    demand = float(np.clip(ENSEMBLE["meta_demand"].predict(meta_d)[0], 5.0, 100.0))

    return {"price": round(price, 2), "demand": round(demand, 1)}


def _price_trend_series(
    crop: str, location: str, month: int,
    history: List[float], demand_hint: float,
    supply_shock: float, rainfall_idx: float, qty: float,
) -> List[float]:
    """Generate 7-point weekly price forecast."""
    series = []
    for week in range(1, 8):
        r = _predict(crop, location, month, week * 7, history, demand_hint, supply_shock, rainfall_idx, qty)
        series.append(r["price"])
    return series


def _confidence(history: List[float], has_xgb: bool) -> float:
    arr = [v for v in history if math.isfinite(v) and v > 0]
    base = 0.68 if has_xgb else 0.60
    length_bonus = min(len(arr), 10) * 0.02
    return round(min(base + length_bonus, 0.96), 2)


def _buy_signal(demand: float, volatility: float, trend: float) -> str:
    if demand >= 70 and trend > 0.05:
        return "Buy Now"
    if demand >= 55 and volatility < 40:
        return "Good Time"
    if volatility > 65:
        return "Wait"
    return "Neutral"


def _risk_level(volatility: float, supply_shock: float) -> str:
    score = volatility + abs(supply_shock) * 20
    if score >= 65:
        return "High"
    if score >= 35:
        return "Medium"
    return "Low"


# ── Pydantic schemas ──────────────────────────────────────────────────────────
class CropPredictionInput(BaseModel):
    crop: str = Field(..., min_length=2, max_length=80)
    location: str = Field(default="market", min_length=2, max_length=80)
    days: int = Field(default=30, ge=7, le=90)
    price_history: List[float] = Field(default_factory=list)
    qty_purchased: float = Field(default=0.0, ge=0)
    supply_shock: float = Field(default=0.0, ge=-1.0, le=1.0)
    rainfall_idx: float = Field(default=0.5, ge=0.0, le=1.0)
    month: Optional[int] = Field(default=None, ge=1, le=12)


class AnalyticsPredictionRequest(BaseModel):
    crops: List[CropPredictionInput] = Field(..., min_length=1, max_length=10)


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "stacked_ensemble_v2",
        "base_learners": "xgboost+random_forest" if HAS_XGB else "gradient_boosting+random_forest",
        "meta_learner": "ridge",
        "features": 14,
        "training_samples": 5000,
    }


@app.post("/ai/analytics-predictions")
def analytics_predictions(req: AnalyticsPredictionRequest):
    """
    Batch endpoint for the Analytics page.
    Returns per-crop: price, demand, volatility, confidence,
    7-week price trend, buy signal, risk level.
    """
    import datetime
    current_month = datetime.datetime.now().month
    results = []

    for item in req.crops:
        month = item.month or current_month
        history = [v for v in item.price_history if math.isfinite(v) and v > 0]

        # Seed history from base prices if empty
        if not history:
            base = CROP_BASE.get(item.crop.lower(), {}).get("base", 25.0)
            history = [base * f for f in [0.93, 0.96, 0.99, 1.01, 1.0]]

        # Get demand first (used as hint for price)
        demand_result = _predict(
            item.crop, item.location, month, item.days,
            history, 55.0, item.supply_shock, item.rainfall_idx, item.qty_purchased,
        )
        demand_score = demand_result["demand"]

        # Get price with demand as hint
        price_result = _predict(
            item.crop, item.location, month, item.days,
            history, demand_score, item.supply_shock, item.rainfall_idx, item.qty_purchased,
        )
        predicted_price = price_result["price"]

        volatility = _volatility(history)
        confidence = _confidence(history, HAS_XGB)
        _, trend, _, _ = _history_stats(history)
        trend_series = _price_trend_series(
            item.crop, item.location, month, history,
            demand_score, item.supply_shock, item.rainfall_idx, item.qty_purchased,
        )
        buy_signal = _buy_signal(demand_score, volatility, trend)
        risk = _risk_level(volatility, item.supply_shock)

        current_price = history[-1] if history else predicted_price
        price_change_pct = round(((predicted_price - current_price) / max(current_price, 1.0)) * 100, 1)

        results.append({
            "crop":              item.crop,
            "predicted_price":   predicted_price,
            "current_price":     round(current_price, 2),
            "price_change_pct":  price_change_pct,
            "demand_score":      round(demand_score, 1),
            "volatility_score":  round(volatility, 1),
            "confidence":        confidence,
            "trend_series":      [round(p, 2) for p in trend_series],
            "buy_signal":        buy_signal,
            "risk_level":        risk,
            "model":             "stacked_ensemble_v2",
        })

    # Sort by demand score descending
    results.sort(key=lambda x: x["demand_score"], reverse=True)
    return {"predictions": results}


@app.post("/ai/single-prediction")
def single_prediction(item: CropPredictionInput):
    """Single crop prediction — used by Node.js fallback."""
    import datetime
    month = item.month or datetime.datetime.now().month
    history = [v for v in item.price_history if math.isfinite(v) and v > 0]
    if not history:
        base = CROP_BASE.get(item.crop.lower(), {}).get("base", 25.0)
        history = [base * f for f in [0.93, 0.96, 0.99, 1.01, 1.0]]

    demand_r = _predict(item.crop, item.location, month, item.days, history, 55.0,
                        item.supply_shock, item.rainfall_idx, item.qty_purchased)
    price_r  = _predict(item.crop, item.location, month, item.days, history,
                        demand_r["demand"], item.supply_shock, item.rainfall_idx, item.qty_purchased)

    volatility = _volatility(history)
    _, trend, _, _ = _history_stats(history)

    return {
        "predicted_price":  price_r["price"],
        "demand_score":     demand_r["demand"],
        "volatility_score": round(volatility, 1),
        "confidence":       _confidence(history, HAS_XGB),
        "buy_signal":       _buy_signal(demand_r["demand"], volatility, trend),
        "risk_level":       _risk_level(volatility, item.supply_shock),
        "model":            "stacked_ensemble_v2",
    }
