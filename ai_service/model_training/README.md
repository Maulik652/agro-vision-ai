# AgroVision AI — Model Training Guide

All training scripts live in this folder. Run them once to produce trained model files.
The AI services load these files at startup and skip retraining on every run.

---

## Prerequisites

Install training dependencies:

```bash
cd agro-vision-ai/ai_service/model_training
pip install -r requirements_training.txt
```

---

## 1. Crop Disease Detection CNN

**Dataset:** PlantVillage (38 disease classes, ~54k images)
**Download:** https://www.kaggle.com/datasets/emmarex/plantdisease

```bash
# 1. Download and extract to:
#    model_training/data/PlantVillage/

# 2. Train (GPU recommended, ~20 min on GPU / ~2 hrs on CPU)
python train_disease_cnn.py \
    --data_dir data/PlantVillage \
    --output   ../ai_scan_models/models/disease_mobilenet.onnx \
    --epochs   15 \
    --batch    32
```

**Output files:**
- `ai_scan_models/models/disease_mobilenet.onnx`
- `ai_scan_models/models/disease_labels.json`

**Set in `server/.env`:**
```
SCAN_DISEASE_MODEL_PATH=../ai_service/ai_scan_models/models/disease_mobilenet.onnx
SCAN_DISEASE_LABELS_PATH=../ai_service/ai_scan_models/models/disease_labels.json
```

---

## 2. Pest Detection CNN

**Dataset:** IP102 (102 pest classes, ~75k images)
**Download:** https://github.com/xpwu95/IP102

Alternative (smaller): Pest24
**Download:** https://www.kaggle.com/datasets/gauravduttakiit/pest-dataset

```bash
# 1. Download and extract to:
#    model_training/data/IP102/
#    (or model_training/data/pest24/ for the smaller dataset)

# 2. Train
python train_pest_detection.py \
    --data_dir data/IP102 \
    --output   ../ai_scan_models/models/pest_mobilenet.onnx \
    --epochs   15 \
    --batch    32
```

**Output files:**
- `ai_scan_models/models/pest_mobilenet.onnx`
- `ai_scan_models/models/pest_labels.json`

**Set in `server/.env`:**
```
SCAN_PEST_MODEL_PATH=../ai_service/ai_scan_models/models/pest_mobilenet.onnx
SCAN_PEST_LABELS_PATH=../ai_service/ai_scan_models/models/pest_labels.json
```

---

## 3. Crop Recommendation (XGBoost + RandomForest)

**Dataset:** Crop Recommendation Dataset (2200 samples, 22 crops)
**Download:** https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset

```bash
# 1. Download CSV and save to:
#    model_training/data/crop_recommendation.csv

# 2. Train (~1 min)
python train_crop_recommendation.py \
    --csv    data/crop_recommendation.csv \
    --output ../saved_models/crop_recommendation_model.pkl
```

**Output files:**
- `saved_models/crop_recommendation_model.pkl`
- `saved_models/crop_recommendation_model_labels.json`

**Set in `server/.env`:**
```
CROP_RECOMMENDATION_MODEL_PATH=../ai_service/saved_models/crop_recommendation_model.pkl
```

**Note:** If the model file is not present, `crop_recommendation.py` automatically falls back to the deterministic scoring engine — no service interruption.

---

## 4. Market Price Prediction (XGBoost Regressor)

**Dataset:** Agmarknet India commodity prices
**Download:** https://www.kaggle.com/datasets/srinivas1/agmarknet

```bash
# 1. Download CSV and save to:
#    model_training/data/agmarknet_prices.csv

# 2. Train (~5 min for full dataset)
python train_market_price.py \
    --csv    data/agmarknet_prices.csv \
    --output ../saved_models/market_price_model.pkl
```

**Output files:**
- `saved_models/market_price_model.pkl`
- `saved_models/market_price_model_commodities.json`

---

## Directory Structure After Training

```
ai_service/
├── saved_models/
│   ├── analytics_ensemble.joblib          ← auto-generated on first analytics service start
│   ├── buyer_dashboard_models.joblib      ← auto-generated on first buyer AI service start
│   ├── crop_recommendation_model.pkl      ← from train_crop_recommendation.py
│   └── market_price_model.pkl             ← from train_market_price.py
└── ai_scan_models/
    └── models/
        ├── disease_mobilenet.onnx         ← from train_disease_cnn.py
        ├── disease_labels.json
        ├── pest_mobilenet.onnx            ← from train_pest_detection.py
        └── pest_labels.json
```

---

## Service Startup Order

```bash
# Terminal 1 — Crop scan (port 8001)
cd agro-vision-ai/ai_service
uvicorn crop_scan_api:app --host 0.0.0.0 --port 8001

# Terminal 2 — Weather AI (port 8002)
uvicorn weather_ai_microservice:app --host 0.0.0.0 --port 8002

# Terminal 3 — Analytics predictions (port 8003)
uvicorn analytics_prediction_service:app --host 0.0.0.0 --port 8003

# Terminal 4 — Buyer dashboard AI (port 8004)
uvicorn buyer_dashboard_ai_service:app --host 0.0.0.0 --port 8004

# Terminal 5 — Marketplace AI (port 8101)
uvicorn marketplace_ai:app --host 0.0.0.0 --port 8101

# Terminal 6 — Node.js backend (port 5000)
cd agro-vision-ai/server
npm start
```
