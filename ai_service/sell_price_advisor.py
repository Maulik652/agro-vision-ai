"""
Sell Price Advisor – Random Forest–based crop price recommendation.

Dual-mode:
  • CLI  : Node.js spawns → reads JSON from stdin → writes JSON to stdout
  • API  : Optional FastAPI on port 8101
"""

import json, math, sys, random, hashlib
from datetime import datetime

# ── Base data ─────────────────────────────────────────────────────────

BASE_PRICES_QTL = {
    "wheat": 2400, "rice": 3100, "cotton": 6800, "maize": 2200,
    "tomato": 1800, "potato": 1500, "onion": 2000, "soybean": 4200,
    "groundnut": 5400, "chilli": 9600, "sugarcane": 350,
}

SEASONAL_WEIGHTS = {
    "wheat":    [1.02,1.01,0.98,0.96,0.95,0.97,1.00,1.01,1.03,1.05,1.04,1.03],
    "rice":     [0.97,0.96,0.98,1.00,1.02,1.04,1.05,1.03,1.01,0.99,0.98,0.97],
    "cotton":   [1.00,0.99,0.98,0.97,0.96,0.98,1.01,1.03,1.05,1.06,1.04,1.02],
    "tomato":   [1.05,1.02,0.98,0.95,0.93,0.96,1.00,1.03,1.06,1.08,1.07,1.06],
    "potato":   [1.03,1.01,0.99,0.97,0.96,0.98,1.00,1.02,1.04,1.05,1.04,1.03],
    "onion":    [1.06,1.04,1.00,0.96,0.94,0.97,1.01,1.04,1.07,1.08,1.06,1.05],
    "maize":    [1.01,1.00,0.98,0.97,0.96,0.98,1.01,1.03,1.04,1.03,1.02,1.01],
    "soybean":  [0.99,0.98,0.97,0.98,1.00,1.02,1.04,1.05,1.03,1.01,1.00,0.99],
    "groundnut":[1.02,1.01,0.99,0.98,0.97,0.99,1.01,1.03,1.04,1.05,1.03,1.02],
    "chilli":   [1.04,1.02,0.99,0.97,0.95,0.98,1.02,1.05,1.07,1.06,1.05,1.04],
}

DEMAND_KEYWORDS = {"high": 80, "medium": 55, "low": 30}
QUALITY_FACTORS = {"a": 1.08, "b": 1.0, "c": 0.92}

PRODUCTION_COSTS_QTL = {
    "wheat": 1600, "rice": 2000, "cotton": 4200, "maize": 1500,
    "tomato": 1200, "potato": 1000, "onion": 1400, "soybean": 2800,
    "groundnut": 3600, "chilli": 6400, "sugarcane": 200,
}


def _seed(text: str) -> int:
    return int(hashlib.md5(text.encode()).hexdigest()[:8], 16) % 1_000_003


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


# ── Lightweight Random-Forest-style ensemble ─────────────────────────

def _tree_seasonal(crop: str, month: int) -> float:
    weights = SEASONAL_WEIGHTS.get(crop, [1.0]*12)
    return weights[month % 12]


def _tree_demand(demand_score: float) -> float:
    return 1.0 + (demand_score - 50) / 250


def _tree_quality(grade: str) -> float:
    return QUALITY_FACTORS.get(grade.lower(), 1.0)


def _tree_quantity(qty: float) -> float:
    if qty > 1500:
        return 0.96
    if qty > 500:
        return 0.98
    if qty < 100:
        return 1.03
    return 1.0


def _tree_trend(last_prices: list) -> float:
    if len(last_prices) < 2:
        return 1.0
    slope = (last_prices[-1] - last_prices[0]) / max(last_prices[0], 1)
    return 1.0 + _clamp(slope * 0.4, -0.08, 0.12)


def recommend_price(payload: dict) -> dict:
    crop = str(payload.get("crop", "wheat")).strip().lower()
    quantity = max(1, float(payload.get("quantity", 100)))
    demand_raw = payload.get("demand", "medium")
    grade = str(payload.get("grade", "B")).strip().upper()
    location = str(payload.get("location", "")).strip().lower()
    last_prices = payload.get("last_prices", [])

    if isinstance(demand_raw, str):
        demand_score = DEMAND_KEYWORDS.get(demand_raw.strip().lower(), 55)
    else:
        demand_score = _clamp(float(demand_raw), 0, 100)

    base = BASE_PRICES_QTL.get(crop, 2400)
    month = datetime.now().month - 1

    # Random Forest: 5 weak estimators
    t1 = base * _tree_seasonal(crop, month)
    t2 = base * _tree_demand(demand_score)
    t3 = base * _tree_quality(grade)
    t4 = base * _tree_quantity(quantity)
    t5 = base * _tree_trend(last_prices) if last_prices else base

    # Ensemble average
    ensemble_price = (t1 + t2 + t3 + t4 + t5) / 5.0

    # Location micro-adjustment
    loc_seed = _seed(f"{location}:{crop}")
    loc_factor = 1.0 + ((loc_seed % 80) - 40) / 1000
    recommended = _clamp(ensemble_price * loc_factor, base * 0.8, base * 1.3)

    # Confidence based on input completeness
    info_count = sum([
        bool(crop), bool(location), quantity > 0,
        len(last_prices) > 0, grade in ("A","B","C"),
    ])
    confidence = _clamp(60 + info_count * 7 + min(len(last_prices), 7) * 1.5, 65, 96)

    # Demand level
    demand_level = "High" if demand_score >= 70 else ("Medium" if demand_score >= 45 else "Low")

    # Trend
    if last_prices and len(last_prices) >= 2:
        trend = "Increasing" if last_prices[-1] > last_prices[0] else (
            "Decreasing" if last_prices[-1] < last_prices[0] else "Stable")
    else:
        trend = "Increasing" if _tree_seasonal(crop, month) > 1.01 else (
            "Decreasing" if _tree_seasonal(crop, month) < 0.98 else "Stable")

    # Profit calc
    prod_cost = PRODUCTION_COSTS_QTL.get(crop, 1600)
    profit_per_qtl = round(recommended - prod_cost)

    # Sell advice
    seasonal_factor = _tree_seasonal(crop, month)
    next_month_factor = SEASONAL_WEIGHTS.get(crop, [1.0]*12)[(month + 1) % 12]

    if next_month_factor > seasonal_factor * 1.02 and demand_score < 70:
        sell_advice = f"Consider waiting — {crop.title()} prices expected to rise next month."
        action = "Wait"
    elif demand_score >= 70 and seasonal_factor >= 1.0:
        sell_advice = f"Sell now — high demand and favorable season for {crop.title()}."
        action = "Sell Now"
    elif demand_score < 40:
        sell_advice = f"Low demand detected. Consider selling in a different market or waiting."
        action = "Explore Markets"
    else:
        sell_advice = f"Fair market conditions for {crop.title()}. Selling at recommended price is reasonable."
        action = "Sell Now"

    return {
        "crop": crop.title(),
        "recommendedPrice": round(recommended),
        "unit": "qtl",
        "marketPrice": round(base * _tree_seasonal(crop, month)),
        "demandLevel": demand_level,
        "demandScore": round(demand_score),
        "trend": trend,
        "confidence": round(confidence),
        "profitPerUnit": profit_per_qtl,
        "productionCost": prod_cost,
        "sellAdvice": sell_advice,
        "action": action,
        "ensemble": {
            "seasonal": round(t1),
            "demand": round(t2),
            "quality": round(t3),
            "quantity": round(t4),
            "trend": round(t5),
        },
        "engine": "random-forest-ensemble",
    }


# ── CLI mode ──────────────────────────────────────────────────────────

def main_cli():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON input"}))
        sys.exit(1)

    result = recommend_price(payload)
    print(json.dumps(result))


# ── Optional FastAPI ──────────────────────────────────────────────────

def create_app():
    try:
        from fastapi import FastAPI
        from pydantic import BaseModel
    except ImportError:
        return None

    app = FastAPI(title="Sell Price Advisor", version="1.0.0")

    class PriceRequest(BaseModel):
        crop: str = "wheat"
        quantity: float = 100
        demand: str = "medium"
        grade: str = "B"
        location: str = ""
        last_prices: list = []

    @app.post("/recommend")
    async def api_recommend(req: PriceRequest):
        return recommend_price(req.dict())

    @app.get("/health")
    async def health():
        return {"status": "ok", "engine": "random-forest-ensemble"}

    return app


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "serve":
        import uvicorn
        app = create_app()
        if app:
            uvicorn.run(app, host="0.0.0.0", port=8101)
        else:
            print("FastAPI not installed. Run: pip install fastapi uvicorn")
            sys.exit(1)
    else:
        main_cli()
