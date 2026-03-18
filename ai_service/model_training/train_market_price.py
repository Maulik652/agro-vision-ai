"""
Market Price Prediction Model — XGBoost Regressor on Agmarknet dataset.

Usage:
    # 1. Download dataset:
    #    https://www.kaggle.com/datasets/srinivas1/agmarknet
    #    Save CSV to: model_training/data/agmarknet_prices.csv

    python train_market_price.py \
        --csv     data/agmarknet_prices.csv \
        --output  ../saved_models/market_price_model.pkl

Output:
    market_price_model.pkl  → loaded by analytics_prediction_service.py

Expected CSV columns (Agmarknet format):
    State, District, Market, Commodity, Variety, Grade,
    Arrival_Date, Min_x0020_Price, Max_x0020_Price, Modal_x0020_Price

    OR simplified format:
    commodity, market, state, month, min_price, max_price, modal_price
"""

import argparse
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

try:
    from xgboost import XGBRegressor
    HAS_XGB = True
except ImportError:
    from sklearn.ensemble import GradientBoostingRegressor
    HAS_XGB = False
    print("XGBoost not found — using GradientBoostingRegressor")

try:
    from sklearn.ensemble import RandomForestRegressor
    HAS_RF = True
except ImportError:
    HAS_RF = False


# ── Column name normalisation map ─────────────────────────────────────────────
_COL_ALIASES = {
    # Agmarknet raw column names
    "commodity":            "commodity",
    "state":                "state",
    "district":             "district",
    "market":               "market",
    "variety":              "variety",
    "grade":                "grade",
    "arrival_date":         "arrival_date",
    "min_x0020_price":      "min_price",
    "max_x0020_price":      "max_price",
    "modal_x0020_price":    "modal_price",
    # Simplified column names
    "min_price":            "min_price",
    "max_price":            "max_price",
    "modal_price":          "modal_price",
    "month":                "month",
    "price":                "modal_price",
}

FEATURE_COLS = ["commodity_enc", "state_enc", "market_enc", "month", "min_price", "max_price"]
TARGET_COL   = "modal_price"


def _normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    df = df.rename(columns={k: v for k, v in _COL_ALIASES.items() if k in df.columns})
    return df


def _parse_date_month(df: pd.DataFrame) -> pd.DataFrame:
    """Extract month from arrival_date if present, else default to 6."""
    if "arrival_date" in df.columns:
        try:
            df["arrival_date"] = pd.to_datetime(df["arrival_date"], dayfirst=True, errors="coerce")
            df["month"] = df["arrival_date"].dt.month.fillna(6).astype(int)
        except Exception:
            df["month"] = 6
    elif "month" not in df.columns:
        df["month"] = 6
    return df


def load_data(csv_path: str):
    df = pd.read_csv(csv_path, low_memory=False)
    df = _normalise_columns(df)
    df = _parse_date_month(df)

    # Validate required columns
    required = ["commodity", "modal_price"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(
            f"Missing required columns: {missing}\n"
            f"Available columns: {list(df.columns)}\n"
            "Expected Agmarknet CSV with columns: Commodity, Modal_x0020_Price, etc."
        )

    # Fill optional columns
    for col in ["state", "market", "min_price", "max_price"]:
        if col not in df.columns:
            df[col] = "unknown" if col in ("state", "market") else df["modal_price"]

    # Drop rows with missing target
    df = df.dropna(subset=["modal_price"])
    df["modal_price"] = pd.to_numeric(df["modal_price"], errors="coerce")
    df = df.dropna(subset=["modal_price"])
    df = df[df["modal_price"] > 0]

    # Numeric price columns
    for col in ["min_price", "max_price"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(df["modal_price"])

    # Encode categoricals
    encoders = {}
    for col in ["commodity", "state", "market"]:
        le = LabelEncoder()
        df[f"{col}_enc"] = le.fit_transform(df[col].astype(str).str.strip().str.lower())
        encoders[col] = le

    X = df[FEATURE_COLS].values.astype(float)
    y = df[TARGET_COL].values.astype(float)

    return X, y, encoders, df


def build_model():
    if HAS_XGB:
        return XGBRegressor(
            n_estimators=500,
            max_depth=6,
            learning_rate=0.04,
            subsample=0.85,
            colsample_bytree=0.80,
            min_child_weight=3,
            reg_alpha=0.1,
            reg_lambda=1.5,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=-1,
        )
    return GradientBoostingRegressor(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.04,
        subsample=0.85,
        random_state=42,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv",    default="data/agmarknet_prices.csv")
    parser.add_argument("--output", default="../saved_models/market_price_model.pkl")
    parser.add_argument("--sample", type=int, default=200_000,
                        help="Max rows to use (large datasets can be slow)")
    args = parser.parse_args()

    if not os.path.isfile(args.csv):
        print(f"ERROR: CSV not found at '{args.csv}'")
        print("Download from: https://www.kaggle.com/datasets/srinivas1/agmarknet")
        sys.exit(1)

    print("Loading data...")
    X, y, encoders, df = load_data(args.csv)
    print(f"  Total samples: {len(X)}")

    # Subsample if dataset is very large
    if len(X) > args.sample:
        rng = np.random.default_rng(42)
        idx = rng.choice(len(X), args.sample, replace=False)
        X, y = X[idx], y[idx]
        print(f"  Subsampled to: {len(X)} rows")

    print(f"  Commodities: {len(encoders['commodity'].classes_)}")
    print(f"  States:      {len(encoders['state'].classes_)}")
    print(f"  Markets:     {len(encoders['market'].classes_)}")
    print(f"  Price range: ₹{y.min():.0f} – ₹{y.max():.0f}/quintal")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    print(f"Training {'XGBoost' if HAS_XGB else 'GradientBoosting'} regressor...")
    model = build_model()
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    mae  = mean_absolute_error(y_test, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2   = r2_score(y_test, y_pred)

    print(f"\nTest metrics:")
    print(f"  MAE:  ₹{mae:.2f}/quintal")
    print(f"  RMSE: ₹{rmse:.2f}/quintal")
    print(f"  R²:   {r2:.4f}")

    # 5-fold CV
    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, scaler.transform(X), y, cv=cv,
                                scoring="r2", n_jobs=-1)
    print(f"  5-fold CV R²: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Save bundle
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    bundle = {
        "model":      model,
        "scaler":     scaler,
        "encoders":   encoders,
        "features":   FEATURE_COLS,
        "target":     TARGET_COL,
        "mae":        round(float(mae), 2),
        "rmse":       round(float(rmse), 2),
        "r2":         round(float(r2), 4),
        "model_type": "xgboost" if HAS_XGB else "gradient_boosting",
    }
    joblib.dump(bundle, args.output)
    print(f"\nModel saved → {args.output}")

    # Save commodity list as JSON
    labels_path = args.output.replace(".pkl", "_commodities.json")
    with open(labels_path, "w") as f:
        json.dump(list(encoders["commodity"].classes_), f, indent=2)
    print(f"Commodity list saved → {labels_path}")

    print("\nUsage in your service:")
    print(f"  bundle = joblib.load('{args.output}')")
    print("  enc = bundle['encoders']")
    print("  X_new = [[enc['commodity'].transform(['wheat'])[0],")
    print("            enc['state'].transform(['maharashtra'])[0],")
    print("            enc['market'].transform(['pune'])[0],")
    print("            month, min_price, max_price]]")
    print("  price = bundle['model'].predict(bundle['scaler'].transform(X_new))[0]")


if __name__ == "__main__":
    main()
