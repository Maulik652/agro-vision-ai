from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field


class WeatherPoint(BaseModel):
    temperature: float = Field(default=30)
    humidity: float = Field(default=60, ge=0, le=100)
    rainProbability: float = Field(default=35, ge=0, le=100)
    windSpeed: float = Field(default=10, ge=0)
    cloudCoverage: float = Field(default=45, ge=0, le=100)
    condition: str = Field(default="Cloudy")
    day: Optional[str] = None
    dateISO: Optional[str] = None


class LocationInfo(BaseModel):
    name: str = Field(default="Farm Zone")
    city: str = Field(default="")
    state: str = Field(default="")


class WeatherAnalysisRequest(BaseModel):
    current: WeatherPoint
    forecast: List[WeatherPoint] = Field(default_factory=list)
    cropType: str = Field(default="General Crop")
    location: Optional[LocationInfo] = None


class AlertItem(BaseModel):
    level: str
    title: str
    detail: str
    action: str


class WeatherAnalysisResponse(BaseModel):
    summary: str
    recommendations: List[str]
    alerts: List[AlertItem]
    riskScore: int
    irrigationHint: str
    engine: str = "fastapi-weather-ai"
    generatedAt: str


app = FastAPI(
    title="AgroVision Weather AI Microservice",
    description="AI weather analysis for farming decisions",
    version="1.0.0",
)


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _build_analysis(payload: WeatherAnalysisRequest) -> WeatherAnalysisResponse:
    window = [payload.current, *payload.forecast[:7]]

    highest_rain = max(point.rainProbability for point in window)
    highest_temp = max(point.temperature for point in window)
    highest_wind = max(point.windSpeed for point in window)
    avg_humidity = sum(point.humidity for point in window) / max(1, len(window))

    recommendations: List[str] = []
    alerts: List[AlertItem] = []

    if highest_rain >= 60:
        recommendations.append(
            "Rainfall is likely in the next 24 hours. Delay irrigation for one day."
        )
        alerts.append(
            AlertItem(
                level="high",
                title="Heavy rainfall expected",
                detail=f"Rain probability may reach {round(highest_rain)} percent in coming days.",
                action="Delay irrigation and clear drainage channels to prevent waterlogging.",
            )
        )

    if highest_temp >= 35:
        recommendations.append(
            "High temperature window detected. Increase irrigation frequency in short cycles."
        )
        alerts.append(
            AlertItem(
                level="medium",
                title="Heat stress warning",
                detail=f"Temperature can rise up to {round(highest_temp)} C.",
                action="Irrigate at dawn and use mulch to reduce evaporation loss.",
            )
        )

    if avg_humidity >= 78:
        recommendations.append(
            "Humidity is high. Increase crop scouting for fungal leaf infections."
        )
        alerts.append(
            AlertItem(
                level="medium",
                title="Fungal disease risk",
                detail=f"Average humidity is around {round(avg_humidity)} percent.",
                action="Avoid late-evening irrigation and improve canopy airflow.",
            )
        )

    if highest_wind >= 24:
        recommendations.append(
            "Strong wind expected. Avoid pesticide spraying during peak wind hours."
        )
        alerts.append(
            AlertItem(
                level="medium",
                title="Strong wind conditions",
                detail=f"Wind speed could touch {round(highest_wind)} km/h.",
                action="Shift foliar operations to low-wind time windows.",
            )
        )

    if not recommendations:
        recommendations.append(
            "Weather outlook is mostly stable. Continue standard irrigation and monitoring plan."
        )

    risk_score = round(
        _clamp(
            highest_rain * 0.35
            + max(0.0, highest_temp - 28.0) * 3.1
            + highest_wind * 0.6
            + max(0.0, avg_humidity - 65.0) * 0.85,
            8,
            95,
        )
    )

    if highest_rain >= 60:
        summary = (
            f"{payload.cropType} weather analysis indicates rain-driven irrigation opportunity and drainage risk."
        )
        irrigation_hint = "Delay irrigation for 24 hours and review soil moisture after rainfall."
    elif highest_temp >= 35:
        summary = (
            f"{payload.cropType} weather analysis indicates heat stress risk over the next few days."
        )
        irrigation_hint = (
            "Schedule irrigation in early morning and evening with short-duration cycles."
        )
    else:
        summary = "Weather pattern is relatively balanced for planned farm operations."
        irrigation_hint = "Keep one moderate irrigation cycle in early morning."

    return WeatherAnalysisResponse(
        summary=summary,
        recommendations=recommendations,
        alerts=alerts,
        riskScore=risk_score,
        irrigationHint=irrigation_hint,
        generatedAt=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "weather-ai",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/analyze", response_model=WeatherAnalysisResponse)
def analyze_weather(payload: WeatherAnalysisRequest) -> WeatherAnalysisResponse:
    return _build_analysis(payload)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("weather_ai_microservice:app", host="0.0.0.0", port=8002, reload=False)
