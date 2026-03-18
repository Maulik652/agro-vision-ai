"""
Crop Recommendation Model — XGBoost / RandomForest on Kaggle dataset.

Usage:
    # 1. Download dataset:
    #    https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset
    #    Save CSV to: model_training/data/crop_recommendation.csv

    python train_crop_recommendation.py \
        --csv     data/crop_recommendation.csv \
        --output  ../saved_models/crop_recommendation_model.pkl

Output:
    crop_recommendation_model.pkl  → loaded by analytics_prediction_service.py

Dataset columns:
    N, P, K, temperature, humidity, ph, rainfall, label
    (label = crop name string, 22 classes)
"""

import argparse
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    print("XGBoost not found — using RandomForest only")


FEATURE_COLS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
LABEL_COL    = "label"


def load_data(csv_path: str):
    df = pd.read_csv(csv_path)

    # Normalise column names
    df.columns = [c.strip().lower() for c in df.columns]
    col_map = {
        "n": "N", "p": "P", "k": "K",
        "temperature": "temperature",
        "humidity": "humidity",
        "ph": "ph",
        "rainfall": "rainfall",
        "label": "label",
    }
    df = df.rename(columns=col_map)

    missing = [c for c in FEATURE_COLS + [LABEL_COL] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in CSV: {missing}")

    X = df[FEATURE_COLS].values.astype(float)
    y_raw = df[LABEL_COL].values

    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    return X, y, le


def build_ensemble(n_classes: int):
    rf = RandomForestClassifier(
        n_estimators=400,
        max_depth=None,
        min_samples_leaf=1,
        max_features="sqrt",
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )

    if HAS_XGB:
        xgb = XGBClassifier(
            n_estimators=400,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            use_label_encoder=False,
            eval_metric="mlogloss",
            random_state=42,
            n_jobs=-1,
        )
        estimators = [("rf", rf), ("xgb", xgb)]
        return VotingClassifier(estimators=estimators, voting="soft", n_jobs=-1)

    return rf


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv",    default="data/crop_recommendation.csv")
    parser.add_argument("--output", default="../saved_models/crop_recommendation_model.pkl")
    args = parser.parse_args()

    if not os.path.isfile(args.csv):
        print(f"ERROR: CSV not found at '{args.csv}'")
        print("Download from: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset")
        sys.exit(1)

    print("Loading data...")
    X, y, le = load_data(args.csv)
    print(f"  Samples: {len(X)} | Classes: {len(le.classes_)}")
    print(f"  Crops: {list(le.classes_)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    print("Training ensemble...")
    model = build_ensemble(len(le.classes_))
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nTest accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # 5-fold CV
    cv_scores = cross_val_score(model, scaler.transform(X), y, cv=5, scoring="accuracy", n_jobs=-1)
    print(f"5-fold CV accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Save model bundle
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    bundle = {
        "model":   model,
        "scaler":  scaler,
        "encoder": le,
        "features": FEATURE_COLS,
        "classes": list(le.classes_),
        "accuracy": round(float(acc), 4),
    }
    joblib.dump(bundle, args.output)
    print(f"\nModel saved → {args.output}")

    # Save class list as JSON for reference
    labels_path = args.output.replace(".pkl", "_labels.json")
    with open(labels_path, "w") as f:
        json.dump(list(le.classes_), f, indent=2)
    print(f"Labels saved → {labels_path}")

    print("\nUsage in your service:")
    print(f"  bundle = joblib.load('{args.output}')")
    print("  X_new = bundle['scaler'].transform([[N, P, K, temp, humidity, ph, rainfall]])")
    print("  crop  = bundle['encoder'].inverse_transform(bundle['model'].predict(X_new))[0]")


if __name__ == "__main__":
    main()
