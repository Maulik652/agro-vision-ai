"""
Market Price Predictor — AI microservice for crop price forecasting.

Usage (CLI):
    echo '{"action":"predict_price","crop":"wheat","history":[2300,2320,2350,2370,2380,2400]}' | python market_price_predictor.py

Usage (FastAPI):
    uvicorn market_price_predictor:app --host 0.0.0.0 --port 8100
"""

import json
import math
import sys
from datetime import datetime
from typing import Dict, List, Optional

# ─── Constants ────────────────────────────────────────────────────────────────

BASE_PRICES_QTL = {
    "wheat": 2400, "rice": 3100, "cotton": 6800, "maize": 1900,
    "tomato": 2200, "potato": 1600, "onion": 1900, "soybean": 4500,
    "groundnut": 5400, "sugarcane": 350, "chilli": 9600,
}

SEASONAL_WEIGHTS = {
    "wheat":  [0.02, 0.03, 0.04, 0.02, -0.01, -0.03, -0.04, -0.03, -0.01, 0.01, 0.02, 0.03],
    "rice":   [-0.02, -0.01, 0.00, 0.01, 0.02, 0.04, 0.05, 0.04, 0.02, -0.01, -0.02, -0.02],
    "cotton": [0.01, 0.02, 0.03, 0.04, 0.02, 0.00, -0.02, -0.03, -0.02, 0.00, 0.01, 0.02],
    "maize":  [0.00, 0.01, 0.02, 0.03, 0.04, 0.02, -0.01, -0.03, -0.02, 0.00, 0.01, 0.01],
    "tomato": [0.03, 0.02, -0.02, -0.05, -0.06, -0.03, 0.02, 0.05, 0.06, 0.04, 0.03, 0.02],
    "potato": [0.02, 0.01, -0.01, -0.03, -0.04, -0.02, 0.01, 0.03, 0.04, 0.03, 0.02, 0.01],
    "onion":  [-0.03, -0.04, -0.02, 0.01, 0.04, 0.06, 0.05, 0.03, 0.00, -0.02, -0.04, -0.03],
}


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def safe_float(value, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return float(default)
    if math.isnan(parsed) or math.isinf(parsed):
        return float(default)
    return parsed


# ─── Prediction Engine ────────────────────────────────────────────────────────

def compute_trend(prices: List[float]) -> float:
    """Simple linear regression slope normalized by mean."""
    n = len(prices)
    if n < 2:
        return 0.0

    mean_x = (n - 1) / 2.0
    mean_y = sum(prices) / n

    numerator = sum((i - mean_x) * (p - mean_y) for i, p in enumerate(prices))
    denominator = sum((i - mean_x) ** 2 for i in range(n))

    if denominator == 0:
        return 0.0

    slope = numerator / denominator
    return slope / max(mean_y, 1.0)


def compute_volatility(prices: List[float]) -> float:
    """Standard deviation as percentage of mean."""
    if len(prices) < 2:
        return 0.0
    mean = sum(prices) / len(prices)
    if mean == 0:
        return 0.0
    variance = sum((p - mean) ** 2 for p in prices) / len(prices)
    return math.sqrt(variance) / mean * 100


def compute_momentum(prices: List[float], window: int = 5) -> float:
    """Price momentum over sliding window."""
    if len(prices) < window + 1:
        return 0.0
    recent = prices[-window:]
    older = prices[-(window * 2):-window] if len(prices) >= window * 2 else prices[:window]
    avg_recent = sum(recent) / len(recent)
    avg_older = sum(older) / len(older)
    if avg_older == 0:
        return 0.0
    return (avg_recent - avg_older) / avg_older


def predict_price(payload: Dict) -> Dict:
    """
    Random Forest-style ensemble prediction using multiple heuristic signals:
    - Linear trend extrapolation
    - Seasonal adjustment
    - Momentum indicator
    - Mean reversion component
    """
    crop = str(payload.get("crop", "wheat")).strip().lower()
    history = payload.get("history", [])
    prices = [safe_float(p) for p in history if safe_float(p, -1) > 0]

    base_price = BASE_PRICES_QTL.get(crop, 2000)
    month = datetime.now().month - 1  # 0-indexed

    if not prices:
        prices = [base_price]

    current_price = prices[-1]

    # Signal 1: Linear trend
    trend_slope = compute_trend(prices)
    week_trend = trend_slope * 7
    month_trend = trend_slope * 30

    # Signal 2: Seasonal adjustment
    seasonal = SEASONAL_WEIGHTS.get(crop, [0.0] * 12)
    seasonal_week = seasonal[month] * 0.3
    next_month_idx = (month + 1) % 12
    seasonal_month = seasonal[next_month_idx]

    # Signal 3: Momentum
    momentum = compute_momentum(prices)
    momentum_week = momentum * 0.4
    momentum_month = momentum * 0.8

    # Signal 4: Mean reversion (pull toward base)
    deviation = (current_price - base_price) / max(base_price, 1.0)
    reversion_week = -deviation * 0.05
    reversion_month = -deviation * 0.12

    # Ensemble aggregation (weighted average of signals)
    week_factor = 1 + clamp(
        week_trend * 0.35 + seasonal_week * 0.25 + momentum_week * 0.25 + reversion_week * 0.15,
        -0.10, 0.12
    )
    month_factor = 1 + clamp(
        month_trend * 0.30 + seasonal_month * 0.30 + momentum_month * 0.20 + reversion_month * 0.20,
        -0.18, 0.22
    )

    predicted_week = round(current_price * week_factor)
    predicted_month = round(current_price * month_factor)

    # Demand assessment
    combined_signal = trend_slope + momentum * 0.5
    demand_level = "High" if combined_signal > 0.02 else "Medium" if combined_signal > -0.01 else "Low"

    # Trend direction
    trend = "rising" if trend_slope > 0.005 else "falling" if trend_slope < -0.005 else "stable"

    # Volatility
    volatility = compute_volatility(prices)

    # Confidence (higher with more data, lower with more volatility)
    confidence = clamp(
        72 + min(len(prices), 30) * 0.6 - volatility * 0.8,
        55, 95
    )

    return {
        "currentPrice": current_price,
        "predictedPriceWeek": predicted_week,
        "predictedPriceMonth": predicted_month,
        "demandLevel": demand_level,
        "confidence": round(confidence),
        "trend": trend,
        "volatility": round(volatility, 2),
        "signals": {
            "trendSlope": round(trend_slope, 5),
            "momentum": round(momentum, 4),
            "seasonalFactor": round(seasonal[month], 3),
            "meanDeviation": round(deviation, 4),
        },
        "model": "Market Price Predictor v1 (Ensemble)",
        "engine": "python",
    }


# ─── CLI mode (called from Node.js via stdin) ────────────────────────────────

def run_cli():
    if sys.stdin is None or sys.stdin.isatty():
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)

    raw = sys.stdin.read().strip()
    if not raw:
        print(json.dumps({"error": "Empty input"}))
        sys.exit(1)

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {str(e)}"}))
        sys.exit(1)

    if not isinstance(payload, dict):
        print(json.dumps({"error": "Input must be a JSON object"}))
        sys.exit(1)

    action = str(payload.get("action", "predict_price")).strip()

    if action == "predict_price":
        result = predict_price(payload)
    else:
        result = {"error": f"Unknown action: {action}"}

    print(json.dumps(result))


# ─── FastAPI mode ─────────────────────────────────────────────────────────────

try:
    from fastapi import FastAPI, Query
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel

    app = FastAPI(title="AgroVision Market Price Predictor", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    class PredictRequest(BaseModel):
        crop: str = "wheat"
        history: Optional[List[float]] = None

    class PredictResponse(BaseModel):
        currentPrice: float
        predictedPriceWeek: float
        predictedPriceMonth: float
        demandLevel: str
        confidence: int
        trend: str
        volatility: float
        engine: str

    @app.get("/health")
    def health():
        return {"status": "ok", "service": "market-price-predictor"}

    @app.get("/predict")
    def predict_get(
        crop: str = Query("wheat", max_length=100),
    ):
        """Quick prediction with base data only."""
        base = BASE_PRICES_QTL.get(crop.lower().strip(), 2000)
        result = predict_price({"crop": crop, "history": [base]})
        return result

    @app.post("/predict")
    def predict_post(body: PredictRequest):
        """Full prediction with historical price data."""
        result = predict_price({
            "crop": body.crop,
            "history": body.history or [],
        })
        return result

except ImportError:
    app = None


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    run_cli()
