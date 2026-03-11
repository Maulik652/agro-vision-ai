import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from .common import clamp, safe_float, sanitize_crop_type


def _history_file_path() -> Path:
    configured = os.getenv("SCAN_HISTORY_FILE", "").strip()
    if configured:
        path = Path(configured)
        return path if path.is_absolute() else (Path(__file__).resolve().parent / path)

    return Path(__file__).resolve().parent / ".scan_history.jsonl"


def _read_rows(limit: int = 120) -> List[Dict]:
    path = _history_file_path()
    if not path.exists():
        return []

    rows: List[Dict] = []
    try:
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except OSError:
        return []

    if limit > 0:
        return rows[-limit:]

    return rows


def record_scan_snapshot(
    crop_key: str,
    disease_name: str,
    pest_name: str,
    health_score: float,
    weather_risk: float,
    confidence: float,
) -> Dict:
    path = _history_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    row = {
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "crop": sanitize_crop_type(crop_key),
        "disease": str(disease_name or "Unknown"),
        "pest": str(pest_name or "Unknown"),
        "healthScore": round(clamp(safe_float(health_score, 0.0), 0.0, 100.0), 2),
        "weatherRisk": round(clamp(safe_float(weather_risk, 0.0), 0.0, 100.0), 2),
        "confidence": round(clamp(safe_float(confidence, 0.0), 0.0, 100.0), 2),
    }

    try:
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(row, separators=(",", ":")) + "\n")
    except OSError:
        return row

    return row


def analyze_scan_trend(crop_key: str, disease_name: str, lookback: int = 12) -> Dict:
    safe_crop = sanitize_crop_type(crop_key)
    rows = [row for row in _read_rows(limit=max(lookback, 2) * 3) if sanitize_crop_type(row.get("crop", "")) == safe_crop]

    if not rows:
        return {
            "direction": "stable",
            "summary": "No historical scan trend available yet.",
            "sampleSize": 0,
            "healthDelta": 0.0,
            "weatherDelta": 0.0,
            "diseaseFrequency": 0.0,
        }

    recent = rows[-max(lookback, 2):]
    first = recent[0]
    last = recent[-1]

    health_delta = safe_float(last.get("healthScore"), 0.0) - safe_float(first.get("healthScore"), 0.0)
    weather_delta = safe_float(last.get("weatherRisk"), 0.0) - safe_float(first.get("weatherRisk"), 0.0)

    target_disease = str(disease_name or "").strip().lower()
    matching = 0
    for row in recent:
        if str(row.get("disease", "")).strip().lower() == target_disease:
            matching += 1

    disease_frequency = (matching / len(recent)) if recent else 0.0

    if health_delta <= -5.0 or disease_frequency >= 0.6:
        direction = "worsening"
    elif health_delta >= 5.0 and disease_frequency <= 0.35:
        direction = "improving"
    else:
        direction = "stable"

    if direction == "worsening":
        summary = "Historical scans indicate increasing pressure; prioritize immediate field action."
    elif direction == "improving":
        summary = "Historical scans indicate recovery trend after treatment actions."
    else:
        summary = "Historical scans are stable; continue monitoring and scheduled treatment."

    return {
        "direction": direction,
        "summary": summary,
        "sampleSize": len(recent),
        "healthDelta": round(health_delta, 2),
        "weatherDelta": round(weather_delta, 2),
        "diseaseFrequency": round(disease_frequency, 2),
    }
