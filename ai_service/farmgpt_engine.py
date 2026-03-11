"""
FarmGPT — Contextual AI Copilot for Farmers
============================================
Industry-grade agricultural intelligence engine that fuses:
  - Farm profile (crop, soil, location, size)
  - Real-time weather context
  - Market prices & trends
  - Recent scan/pest/disease history
  - Crop calendar stage

Produces contextual, actionable advice in natural language.
"""

import json
import sys
import math
import hashlib
from datetime import datetime, timedelta

# ── Crop Knowledge Base ──────────────────────────────────────────
CROP_KB = {
    "tomato": {
        "scientific": "Solanum lycopersicum",
        "season": ["kharif", "rabi"],
        "duration_days": 120,
        "optimal_temp": (20, 30),
        "optimal_rain_mm": (600, 1200),
        "optimal_humidity": (50, 70),
        "major_pests": ["whitefly", "fruit borer", "aphids", "leaf miner"],
        "major_diseases": ["early blight", "late blight", "bacterial wilt", "leaf curl"],
        "nutrients": {"N": 120, "P": 60, "K": 80},
        "irrigation_interval_days": 5,
        "growth_stages": [
            {"stage": "Germination", "day_range": (0, 15), "care": "Maintain moisture, 25-30°C ideal"},
            {"stage": "Vegetative", "day_range": (15, 45), "care": "Apply nitrogen fertilizer, support staking"},
            {"stage": "Flowering", "day_range": (45, 70), "care": "Reduce nitrogen, increase potassium, monitor pests"},
            {"stage": "Fruiting", "day_range": (70, 100), "care": "Regular irrigation, calcium spray for blossom end rot"},
            {"stage": "Ripening", "day_range": (100, 120), "care": "Reduce irrigation, watch for fruit cracking"}
        ],
        "pesticide_guide": {
            "whitefly": "Imidacloprid 17.8% SL @ 0.3ml/L or Neem oil 3000ppm @ 5ml/L",
            "fruit borer": "Spinosad 45% SC @ 0.3ml/L or install pheromone traps",
            "aphids": "Thiamethoxam 25% WG @ 0.3g/L or Neem oil spray",
            "leaf miner": "Abamectin 1.8% EC @ 0.5ml/L"
        },
        "fertilizer_schedule": [
            {"day": 0, "type": "Basal", "npk": "20:20:20", "dose": "50kg/acre"},
            {"day": 25, "type": "Top dress", "npk": "Urea", "dose": "25kg/acre"},
            {"day": 45, "type": "Flowering boost", "npk": "0:52:34", "dose": "2g/L spray"},
            {"day": 70, "type": "Fruiting", "npk": "13:0:45", "dose": "3g/L spray"}
        ]
    },
    "rice": {
        "scientific": "Oryza sativa",
        "season": ["kharif"],
        "duration_days": 140,
        "optimal_temp": (22, 32),
        "optimal_rain_mm": (1000, 2000),
        "optimal_humidity": (60, 80),
        "major_pests": ["stem borer", "brown planthopper", "leaf folder", "gall midge"],
        "major_diseases": ["blast", "sheath blight", "bacterial leaf blight", "tungro"],
        "nutrients": {"N": 100, "P": 50, "K": 50},
        "irrigation_interval_days": 3,
        "growth_stages": [
            {"stage": "Nursery", "day_range": (0, 25), "care": "Seed treatment, maintain 2-3cm water"},
            {"stage": "Transplanting", "day_range": (25, 35), "care": "3 seedlings/hill, 20x15cm spacing"},
            {"stage": "Tillering", "day_range": (35, 65), "care": "Top dress urea, maintain 5cm water"},
            {"stage": "Panicle Init.", "day_range": (65, 90), "care": "Apply potassium, monitor for blast"},
            {"stage": "Grain Filling", "day_range": (90, 120), "care": "Maintain water level, bird scarer"},
            {"stage": "Maturity", "day_range": (120, 140), "care": "Drain field 15 days before harvest"}
        ],
        "pesticide_guide": {
            "stem borer": "Cartap hydrochloride 4G @ 25kg/ha in standing water",
            "brown planthopper": "Pymetrozine 50% WG @ 0.3g/L, drain excess water",
            "leaf folder": "Chlorantraniliprole 18.5% SC @ 0.3ml/L",
            "gall midge": "Fipronil 5% SC @ 2ml/L"
        },
        "fertilizer_schedule": [
            {"day": 0, "type": "Basal (transplanting)", "npk": "DAP + MOP", "dose": "50kg + 25kg/acre"},
            {"day": 21, "type": "1st top dress", "npk": "Urea", "dose": "35kg/acre"},
            {"day": 42, "type": "2nd top dress", "npk": "Urea", "dose": "35kg/acre"},
            {"day": 65, "type": "Panicle boost", "npk": "MOP", "dose": "25kg/acre"}
        ]
    },
    "wheat": {
        "scientific": "Triticum aestivum",
        "season": ["rabi"],
        "duration_days": 135,
        "optimal_temp": (15, 25),
        "optimal_rain_mm": (400, 650),
        "optimal_humidity": (40, 60),
        "major_pests": ["aphids", "termites", "army worm", "pink stem borer"],
        "major_diseases": ["yellow rust", "brown rust", "karnal bunt", "powdery mildew"],
        "nutrients": {"N": 120, "P": 60, "K": 40},
        "irrigation_interval_days": 20,
        "growth_stages": [
            {"stage": "Sowing", "day_range": (0, 7), "care": "Seed rate 40kg/acre, treat with Thiram"},
            {"stage": "CRI Stage", "day_range": (18, 25), "care": "Critical irrigation, apply 1st nitrogen"},
            {"stage": "Tillering", "day_range": (25, 50), "care": "2nd irrigation, weed control"},
            {"stage": "Jointing", "day_range": (50, 70), "care": "3rd irrigation, 2nd top dress urea"},
            {"stage": "Flowering", "day_range": (70, 90), "care": "4th irrigation, monitor for rust"},
            {"stage": "Grain Fill", "day_range": (90, 120), "care": "5th irrigation, no nitrogen"},
            {"stage": "Maturity", "day_range": (120, 135), "care": "Stop irrigation, plan harvest"}
        ],
        "pesticide_guide": {
            "aphids": "Dimethoate 30% EC @ 1.5ml/L",
            "termites": "Chlorpyrifos 20% EC soil drench @ 4ml/L",
            "yellow rust": "Propiconazole 25% EC @ 1ml/L spray immediately",
            "powdery mildew": "Sulfur 80% WP @ 3g/L"
        },
        "fertilizer_schedule": [
            {"day": 0, "type": "Basal", "npk": "DAP", "dose": "50kg/acre"},
            {"day": 21, "type": "1st top dress (CRI)", "npk": "Urea", "dose": "40kg/acre"},
            {"day": 50, "type": "2nd top dress", "npk": "Urea", "dose": "30kg/acre"}
        ]
    },
    "cotton": {
        "scientific": "Gossypium hirsutum",
        "season": ["kharif"],
        "duration_days": 180,
        "optimal_temp": (25, 35),
        "optimal_rain_mm": (600, 1000),
        "optimal_humidity": (50, 65),
        "major_pests": ["bollworm", "whitefly", "jassids", "thrips", "pink bollworm"],
        "major_diseases": ["bacterial blight", "fusarium wilt", "root rot", "grey mildew"],
        "nutrients": {"N": 80, "P": 40, "K": 40},
        "irrigation_interval_days": 14,
        "growth_stages": [
            {"stage": "Germination", "day_range": (0, 15), "care": "Seed treatment, maintain moisture"},
            {"stage": "Vegetative", "day_range": (15, 50), "care": "Thinning, first nitrogen dose"},
            {"stage": "Squaring", "day_range": (50, 75), "care": "Monitor bollworm, install traps"},
            {"stage": "Flowering", "day_range": (75, 110), "care": "Peak water need, spray schedule"},
            {"stage": "Boll Development", "day_range": (110, 150), "care": "Potassium spray, pink bollworm vigil"},
            {"stage": "Boll Opening", "day_range": (150, 180), "care": "Defoliant if needed, plan picking"}
        ],
        "pesticide_guide": {
            "bollworm": "Emamectin benzoate 5% SG @ 0.4g/L",
            "whitefly": "Diafenthiuron 50% WP @ 1g/L",
            "jassids": "Flonicamid 50% WG @ 0.3g/L",
            "pink bollworm": "Install pheromone traps + Chlorantraniliprole spray"
        },
        "fertilizer_schedule": [
            {"day": 0, "type": "Basal", "npk": "SSP + MOP", "dose": "50kg + 20kg/acre"},
            {"day": 30, "type": "1st top dress", "npk": "Urea", "dose": "25kg/acre"},
            {"day": 60, "type": "2nd top dress", "npk": "Urea", "dose": "25kg/acre"},
            {"day": 90, "type": "Boll boost", "npk": "MOP spray 1%", "dose": "10g/L"}
        ]
    },
    "maize": {
        "scientific": "Zea mays",
        "season": ["kharif", "rabi"],
        "duration_days": 110,
        "optimal_temp": (21, 30),
        "optimal_rain_mm": (500, 800),
        "optimal_humidity": (50, 70),
        "major_pests": ["fall armyworm", "stem borer", "aphids", "shoot fly"],
        "major_diseases": ["maydis leaf blight", "downy mildew", "stalk rot", "common rust"],
        "nutrients": {"N": 120, "P": 60, "K": 40},
        "irrigation_interval_days": 8,
        "growth_stages": [
            {"stage": "Germination", "day_range": (0, 10), "care": "Seed treatment with Thiram + Imidacloprid"},
            {"stage": "Vegetative", "day_range": (10, 40), "care": "Nitrogen top dress, monitor armyworm"},
            {"stage": "Tasseling", "day_range": (40, 55), "care": "Critical irrigation period"},
            {"stage": "Silking", "day_range": (55, 70), "care": "Maximum water need, pollination period"},
            {"stage": "Grain Fill", "day_range": (70, 95), "care": "Maintain moisture, stalk rot watch"},
            {"stage": "Maturity", "day_range": (95, 110), "care": "Black layer check, plan harvest"}
        ],
        "pesticide_guide": {
            "fall armyworm": "Spinetoram 11.7% SC @ 0.5ml/L or Emamectin benzoate",
            "stem borer": "Carbofuran 3G granules in whorl @ 8kg/acre",
            "downy mildew": "Metalaxyl 35% WS seed treatment @ 6g/kg"
        },
        "fertilizer_schedule": [
            {"day": 0, "type": "Basal", "npk": "DAP + MOP", "dose": "50kg + 30kg/acre"},
            {"day": 25, "type": "1st top dress", "npk": "Urea", "dose": "40kg/acre"},
            {"day": 45, "type": "2nd top dress", "npk": "Urea", "dose": "40kg/acre"}
        ]
    },
    "soybean": {
        "scientific": "Glycine max",
        "season": ["kharif"],
        "duration_days": 100,
        "optimal_temp": (20, 30),
        "optimal_rain_mm": (500, 750),
        "optimal_humidity": (55, 70),
        "major_pests": ["stem fly", "girdle beetle", "tobacco caterpillar", "pod borer"],
        "major_diseases": ["yellow mosaic", "charcoal rot", "bacterial pustule", "rust"],
        "nutrients": {"N": 20, "P": 60, "K": 40},
        "irrigation_interval_days": 12,
        "growth_stages": [
            {"stage": "Germination", "day_range": (0, 10), "care": "Rhizobium seed inoculation"},
            {"stage": "Vegetative", "day_range": (10, 35), "care": "Weed management critical, one irrigation"},
            {"stage": "Flowering", "day_range": (35, 55), "care": "Micronutrient spray, pest monitoring"},
            {"stage": "Pod filling", "day_range": (55, 80), "care": "Foliar fertilizer, irrigation if dry"},
            {"stage": "Maturity", "day_range": (80, 100), "care": "Leaves yellowing = ready, plan harvest"}
        ],
        "pesticide_guide": {
            "stem fly": "Thiamethoxam 30% FS seed treatment",
            "tobacco caterpillar": "Nomuraea rileyi biocontrol or Chlorantraniliprole",
            "yellow mosaic": "Whitefly vector control + resistant variety"
        },
        "fertilizer_schedule": [
            {"day": 0, "type": "Basal", "npk": "SSP + MOP", "dose": "50kg + 20kg/acre"},
            {"day": 35, "type": "Foliar spray", "npk": "DAP 2%", "dose": "20g/L"}
        ]
    },
    "groundnut": {
        "scientific": "Arachis hypogaea",
        "season": ["kharif", "rabi"],
        "duration_days": 110,
        "optimal_temp": (22, 30),
        "optimal_rain_mm": (500, 750),
        "optimal_humidity": (50, 65),
        "major_pests": ["aphids", "leaf miner", "white grub", "tobacco caterpillar"],
        "major_diseases": ["tikka disease", "collar rot", "stem rot", "rust"],
        "nutrients": {"N": 20, "P": 40, "K": 50},
        "irrigation_interval_days": 10,
        "growth_stages": [
            {"stage": "Germination", "day_range": (0, 12), "care": "Seed treatment with Trichoderma"},
            {"stage": "Vegetative", "day_range": (12, 35), "care": "Weed control, Gypsum application"},
            {"stage": "Flowering", "day_range": (35, 55), "care": "Critical irrigation, calcium for pegs"},
            {"stage": "Pegging", "day_range": (55, 75), "care": "Earthing up, maintain soil moisture"},
            {"stage": "Pod filling", "day_range": (75, 95), "care": "No waterlogging, foliar boron"},
            {"stage": "Maturity", "day_range": (95, 110), "care": "Pull test — 75% pods mature = harvest"}
        ],
        "pesticide_guide": {
            "tikka disease": "Mancozeb 75% WP @ 2.5g/L at 35, 50, 65 DAS",
            "collar rot": "Seed treatment Carbendazim 2g/kg + Trichoderma",
            "white grub": "Phorate 10G @ 10kg/acre at sowing"
        },
        "fertilizer_schedule": [
            {"day": 0, "type": "Basal", "npk": "SSP + Gypsum", "dose": "100kg SSP + 200kg Gypsum/acre"},
            {"day": 35, "type": "Pegging", "npk": "Gypsum top dress", "dose": "100kg/acre"}
        ]
    }
}

# Default fallback
DEFAULT_CROP_KB = {
    "scientific": "Unknown",
    "season": ["kharif", "rabi"],
    "duration_days": 120,
    "optimal_temp": (20, 30),
    "optimal_rain_mm": (500, 1000),
    "optimal_humidity": (50, 70),
    "major_pests": ["aphids", "caterpillars"],
    "major_diseases": ["fungal blight", "wilt"],
    "nutrients": {"N": 80, "P": 50, "K": 40},
    "irrigation_interval_days": 7,
    "growth_stages": [
        {"stage": "Early Growth", "day_range": (0, 40), "care": "Monitor establishment"},
        {"stage": "Mid Season", "day_range": (40, 80), "care": "Nutrient management"},
        {"stage": "Late Season", "day_range": (80, 120), "care": "Prepare for harvest"}
    ],
    "pesticide_guide": {},
    "fertilizer_schedule": []
}

# ── Weather interpretation ──
def interpret_weather(weather):
    """Convert weather data into farm-actionable insights."""
    if not weather:
        return {"risk_level": "Unknown", "actions": ["Unable to assess weather — check manually."]}

    temp = weather.get("temperature", 25)
    humidity = weather.get("humidity", 60)
    rain_mm = weather.get("rainfall", 0)
    wind_kmh = weather.get("windSpeed", 10)
    condition = weather.get("condition", "clear").lower()

    risks = []
    actions = []

    # Temperature stress
    if temp > 40:
        risks.append("Extreme heat stress")
        actions.append(f"Temperature is {temp}°C — provide shade nets and increase irrigation frequency by 50%.")
    elif temp > 35:
        risks.append("Heat stress")
        actions.append(f"High temperature {temp}°C — irrigate during early morning (5-7 AM) to reduce evaporation.")
    elif temp < 10:
        risks.append("Frost risk")
        actions.append(f"Low temperature {temp}°C — cover seedlings with plastic mulch tonight.")
    elif temp < 5:
        risks.append("Severe frost")
        actions.append(f"CRITICAL: {temp}°C — smoke fires at field borders + overhead sprinkler if available.")

    # Rainfall
    if rain_mm > 50:
        risks.append("Heavy rainfall / waterlogging")
        actions.append(f"Expected {rain_mm}mm rainfall — ensure drainage channels are clear. DO NOT spray pesticide today.")
    elif rain_mm > 20:
        actions.append(f"Moderate rain {rain_mm}mm expected — postpone any foliar spray by 24-48 hours.")
    elif rain_mm == 0 and humidity < 40:
        actions.append("Dry conditions expected — good day for pesticide/fungicide application (spray before 10 AM).")

    # Humidity-disease link
    if humidity > 85:
        risks.append("Fungal disease risk HIGH")
        actions.append(f"Humidity {humidity}% — high risk of fungal diseases. Preventive fungicide spray recommended.")
    elif humidity > 75:
        actions.append(f"Humidity {humidity}% — monitor for early signs of blight/mildew on leaves.")

    # Wind
    if wind_kmh > 40:
        risks.append("Strong winds")
        actions.append(f"Wind speed {wind_kmh} km/h — secure staking for tall crops. Avoid spraying.")
    elif wind_kmh > 25:
        actions.append(f"Moderate wind {wind_kmh} km/h — use low-drift nozzles if spraying.")

    risk_level = "High" if len(risks) >= 2 else "Medium" if risks else "Low"

    if not actions:
        actions.append("Weather conditions are favorable. Proceed with planned farm activities.")

    return {"risk_level": risk_level, "risks": risks, "actions": actions}

# ── Growth stage calculator ──
def get_growth_stage(crop_key, sowing_date_str):
    """Determine current growth stage based on sowing date."""
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)
    if not sowing_date_str:
        return {"stage": "Unknown", "day": 0, "care": "Set your sowing date for accurate tracking."}

    try:
        sowing = datetime.strptime(sowing_date_str[:10], "%Y-%m-%d")
    except (ValueError, TypeError):
        return {"stage": "Unknown", "day": 0, "care": "Invalid sowing date format."}

    days_since = (datetime.now() - sowing).days
    if days_since < 0:
        return {"stage": "Pre-Sowing", "day": days_since, "care": f"Sowing planned in {-days_since} days."}

    current_stage = kb["growth_stages"][-1]
    for gs in kb["growth_stages"]:
        if gs["day_range"][0] <= days_since <= gs["day_range"][1]:
            current_stage = gs
            break

    pct = min(100, int(days_since / kb["duration_days"] * 100))
    est_harvest = sowing + timedelta(days=kb["duration_days"])

    return {
        "stage": current_stage["stage"],
        "day": days_since,
        "totalDays": kb["duration_days"],
        "progress_pct": pct,
        "care": current_stage["care"],
        "estimatedHarvest": est_harvest.strftime("%Y-%m-%d"),
        "daysToHarvest": max(0, (est_harvest - datetime.now()).days)
    }

# ── Intent detection ──
INTENT_PATTERNS = {
    "pesticide|spray|pest|insect|bug|worm|borer|aphid|whitefly": "pest_management",
    "disease|blight|wilt|rust|mildew|rot|fungal|fungus|yellow.*leaf|brown.*spot": "disease_management",
    "irrigat|water|moisture|dry|drought|when.*water": "irrigation",
    "fertiliz|urea|dap|npk|nutrient|nitrogen|phosphorus|potassium|manure": "fertilizer",
    "weather|rain|temperature|forecast|humidity|wind|frost|hail": "weather_advice",
    "price|sell|market|mandi|rate|when.*sell|best.*time": "market_advice",
    "harvest|ready|mature|pick|when.*harvest|yield": "harvest_advice",
    "seed|sow|plant|variety|spacing|seed.*rate": "sowing_advice",
    "soil|ph|organic|health.*card|test": "soil_advice",
    "profit|cost|expense|income|earn|loss": "profit_advice",
    "scheme|subsidy|pm.*kisan|insurance|government|loan": "scheme_advice",
    "hello|hi|good.*morning|hey|namaste": "greeting",
}

import re

def detect_intent(question):
    """Detect the farmer's intent from natural language question."""
    q_lower = question.lower().strip()
    for pattern, intent in INTENT_PATTERNS.items():
        if re.search(pattern, q_lower):
            return intent
    return "general"


# ── Response generators per intent ──

def generate_greeting(context):
    now = datetime.now()
    hour = now.hour
    if hour < 12:
        greeting = "Good morning"
    elif hour < 17:
        greeting = "Good afternoon"
    else:
        greeting = "Good evening"

    crop = context.get("crop", "your crops")
    city = context.get("city", "your area")
    stage = context.get("growth_stage", {})

    lines = [f"{greeting}! Here's your farm briefing for today:"]
    if stage.get("stage") and stage["stage"] != "Unknown":
        lines.append(f"🌱 Your {crop} is in **{stage['stage']}** stage (Day {stage.get('day', '?')}/{stage.get('totalDays', '?')})")
        if stage.get("daysToHarvest", 0) > 0:
            lines.append(f"📅 Expected harvest in **{stage['daysToHarvest']} days** ({stage.get('estimatedHarvest', 'TBD')})")

    weather = context.get("weather_insights", {})
    if weather.get("actions"):
        lines.append(f"\n🌤️ **Weather Alert:** {weather['actions'][0]}")

    lines.append(f"\n💡 **Today's tip:** {stage.get('care', 'Monitor your crops regularly and maintain field hygiene.')}")
    return "\n".join(lines)


def generate_pest_response(context, question):
    crop_key = context.get("crop_key", "tomato")
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)
    weather = context.get("weather", {})
    humidity = weather.get("humidity", 60)
    temp = weather.get("temperature", 28)

    lines = [f"🐛 **Pest Management Advisory for {context.get('crop', 'Your Crop')}**\n"]

    # Check if asking about specific pest
    q_lower = question.lower()
    specific_pest = None
    for pest in kb.get("major_pests", []):
        if pest.lower() in q_lower:
            specific_pest = pest
            break

    if specific_pest and specific_pest in kb.get("pesticide_guide", {}):
        lines.append(f"**Treatment for {specific_pest.title()}:**")
        lines.append(f"💊 {kb['pesticide_guide'][specific_pest]}")
    else:
        lines.append("**Common pests for this crop and recommended treatment:**")
        for pest, treatment in kb.get("pesticide_guide", {}).items():
            lines.append(f"• **{pest.title()}**: {treatment}")

    # Weather-aware spray advice
    rain = weather.get("rainfall", 0)
    if rain > 10:
        lines.append(f"\n⚠️ **DO NOT SPRAY TODAY** — {rain}mm rainfall expected. Spray will wash off. Best to wait 24-48 hours after rain stops.")
    elif humidity > 85:
        lines.append(f"\n⚠️ High humidity ({humidity}%) — spray in early morning (6-8 AM) when dew dries.")
    elif temp > 35:
        lines.append(f"\n☀️ High temperature ({temp}°C) — spray in evening (4-6 PM) to avoid leaf burn.")
    else:
        lines.append(f"\n✅ Current conditions (Temp: {temp}°C, Humidity: {humidity}%) are **good for spraying**. Best time: 7-10 AM.")

    lines.append("\n⚠️ *Always wear protective gear during pesticide application. Follow label dosage strictly.*")
    return "\n".join(lines)


def generate_disease_response(context, question):
    crop_key = context.get("crop_key", "tomato")
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)
    humidity = context.get("weather", {}).get("humidity", 60)

    lines = [f"🦠 **Disease Management for {context.get('crop', 'Your Crop')}**\n"]

    scan = context.get("last_scan", {})
    if scan.get("disease"):
        lines.append(f"📋 **Last scan detected:** {scan['disease']} (Confidence: {scan.get('confidence', 'N/A')}%)")
        lines.append(f"Severity: {scan.get('severity', 'Unknown')}\n")

    lines.append("**Major diseases to watch for:**")
    for d in kb.get("major_diseases", []):
        lines.append(f"• {d.title()}")

    if humidity > 80:
        lines.append(f"\n🔴 **HIGH RISK**: Humidity is {humidity}% — fungal diseases spread rapidly in these conditions.")
        lines.append("**Immediate action:** Apply preventive Mancozeb 75% WP @ 2.5g/L or Copper oxychloride 50% WP @ 3g/L.")
    elif humidity > 65:
        lines.append(f"\n🟡 **MODERATE RISK**: Humidity {humidity}% — keep monitoring for early symptoms (spots, wilting, yellowing).")
    else:
        lines.append(f"\n🟢 **LOW RISK**: Humidity {humidity}% — conditions are dry, low disease pressure.")

    lines.append("\n**General prevention:**")
    lines.append("• Remove and destroy infected plant parts immediately")
    lines.append("• Maintain proper plant spacing for air circulation")
    lines.append("• Avoid overhead irrigation — use drip if possible")
    lines.append("• Rotate crops to break disease cycle")

    return "\n".join(lines)


def generate_irrigation_response(context, question):
    crop_key = context.get("crop_key", "tomato")
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)
    weather = context.get("weather", {})
    temp = weather.get("temperature", 28)
    humidity = weather.get("humidity", 60)
    rain = weather.get("rainfall", 0)
    stage = context.get("growth_stage", {})

    lines = [f"💧 **Irrigation Advisory for {context.get('crop', 'Your Crop')}**\n"]

    interval = kb["irrigation_interval_days"]
    if temp > 35:
        interval = max(2, interval - 2)
        lines.append(f"🌡️ High temperature ({temp}°C) — reduce irrigation interval to **every {interval} days**.")
    elif temp < 15:
        interval = interval + 3
        lines.append(f"❄️ Cool weather ({temp}°C) — extend interval to **every {interval} days**.")
    else:
        lines.append(f"Standard irrigation interval: **every {interval} days** for {context.get('crop', 'this crop')}.")

    if rain > 30:
        lines.append(f"\n🌧️ **Skip irrigation today** — {rain}mm rainfall expected. Check soil moisture in 2 days.")
    elif rain > 10:
        lines.append(f"\n🌦️ Light rain ({rain}mm) expected — **delay irrigation by 1 day**, then check soil.")

    # ET calculation (simplified)
    et_mm = 2.0 + (temp - 20) * 0.15 + (100 - humidity) * 0.02
    lines.append(f"\n📊 **Estimated water need:** {et_mm:.1f} mm/day (based on current weather)")

    if stage.get("stage"):
        lines.append(f"\n🌱 **Growth stage: {stage['stage']}** — {stage.get('care', '')}")

    lines.append("\n**Irrigation tips:**")
    lines.append("• Best time: Early morning (5-7 AM) to reduce evaporation loss")
    lines.append("• Drip irrigation saves 30-50% water vs flood irrigation")
    lines.append("• Mulching reduces water need by 25-30%")

    return "\n".join(lines)


def generate_fertilizer_response(context, question):
    crop_key = context.get("crop_key", "tomato")
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)
    stage = context.get("growth_stage", {})

    lines = [f"🧪 **Fertilizer Advisory for {context.get('crop', 'Your Crop')}**\n"]

    npk = kb.get("nutrients", {})
    lines.append(f"**Total nutrient requirement:** N: {npk.get('N', 80)} kg/ha | P: {npk.get('P', 50)} kg/ha | K: {npk.get('K', 40)} kg/ha\n")

    schedule = kb.get("fertilizer_schedule", [])
    current_day = stage.get("day", 0)

    if schedule:
        lines.append("**Fertilizer Schedule:**")
        for entry in schedule:
            marker = "✅" if current_day > entry["day"] else ("👉" if abs(current_day - entry["day"]) < 7 else "⏳")
            lines.append(f"{marker} Day {entry['day']}: {entry['type']} — {entry['npk']} @ {entry['dose']}")

        # Find next upcoming application
        upcoming = [e for e in schedule if e["day"] > current_day]
        if upcoming:
            nxt = upcoming[0]
            days_until = nxt["day"] - current_day
            lines.append(f"\n📅 **Next application in {days_until} days:** {nxt['type']} — {nxt['npk']} @ {nxt['dose']}")

    soil = context.get("soil_health", {})
    if soil:
        lines.append("\n**Soil Health Status:**")
        for nutrient, value in soil.items():
            if nutrient in ("nitrogen", "phosphorus", "potassium"):
                status = "Low" if value < 200 else "Medium" if value < 400 else "High"
                lines.append(f"• {nutrient.title()}: {value} kg/ha ({status})")

    return "\n".join(lines)


def generate_weather_response(context, question):
    weather = context.get("weather", {})
    insights = context.get("weather_insights", {})

    lines = [f"🌤️ **Weather Advisory for {context.get('city', 'Your Area')}**\n"]

    if weather:
        lines.append(f"**Current Conditions:**")
        lines.append(f"🌡️ Temperature: {weather.get('temperature', 'N/A')}°C")
        lines.append(f"💧 Humidity: {weather.get('humidity', 'N/A')}%")
        lines.append(f"🌧️ Rainfall: {weather.get('rainfall', 0)} mm")
        lines.append(f"💨 Wind: {weather.get('windSpeed', 'N/A')} km/h")
        lines.append(f"☁️ Condition: {weather.get('condition', 'N/A')}")

    if insights:
        risk = insights.get("risk_level", "Unknown")
        lines.append(f"\n**Farm Risk Level:** {'🔴' if risk == 'High' else '🟡' if risk == 'Medium' else '🟢'} {risk}")

        if insights.get("actions"):
            lines.append("\n**Recommended Actions:**")
            for i, action in enumerate(insights["actions"], 1):
                lines.append(f"{i}. {action}")

    return "\n".join(lines)


def generate_market_response(context, question):
    crop = context.get("crop", "Your Crop")
    market = context.get("market", {})

    lines = [f"📈 **Market Intelligence for {crop}**\n"]

    if market.get("currentPrice"):
        lines.append(f"**Current Price:** ₹{market['currentPrice']}/quintal")
    if market.get("trend"):
        trend_icon = "📈" if market["trend"] == "rising" else "📉" if market["trend"] == "falling" else "➡️"
        lines.append(f"**Trend:** {trend_icon} {market['trend'].title()}")
    if market.get("predictedPriceWeek"):
        lines.append(f"**Next week forecast:** ₹{market['predictedPriceWeek']}/quintal")
    if market.get("predictedPriceMonth"):
        lines.append(f"**Next month forecast:** ₹{market['predictedPriceMonth']}/quintal")

    stage = context.get("growth_stage", {})
    if stage.get("daysToHarvest") and stage["daysToHarvest"] > 0:
        lines.append(f"\n📅 Your harvest is ~{stage['daysToHarvest']} days away.")
        if market.get("trend") == "rising":
            lines.append("💡 **Advice:** Prices are rising — consider holding after harvest for 1-2 weeks for better rates.")
        elif market.get("trend") == "falling":
            lines.append("💡 **Advice:** Prices are declining — sell quickly after harvest. Consider pre-booking buyers now.")
        else:
            lines.append("💡 **Advice:** Prices are stable — sell when your crop quality is best for premium rates.")

    lines.append("\n**Selling Tips:**")
    lines.append("• List on AgroVision marketplace 1 week before harvest")
    lines.append("• Grade your produce (A/B/C) — Grade A fetches 15-20% premium")
    lines.append("• Compare prices across 3-4 nearby mandis before selling")
    lines.append("• Morning arrivals at mandi get better rates than afternoon")

    return "\n".join(lines)


def generate_harvest_response(context, question):
    crop = context.get("crop", "Your Crop")
    crop_key = context.get("crop_key", "tomato")
    stage = context.get("growth_stage", {})
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)

    lines = [f"🌾 **Harvest Advisory for {crop}**\n"]

    if stage.get("stage") and stage["stage"] != "Unknown":
        lines.append(f"**Current Stage:** {stage['stage']} (Day {stage.get('day', '?')}/{stage.get('totalDays', '?')})")
        lines.append(f"**Progress:** {stage.get('progress_pct', 0)}% complete")

        if stage.get("daysToHarvest", 0) > 0:
            lines.append(f"**Estimated Harvest:** {stage.get('estimatedHarvest', 'TBD')} ({stage['daysToHarvest']} days remaining)")
        elif stage.get("daysToHarvest", 0) == 0:
            lines.append("🟢 **Your crop is READY for harvest!**")
        else:
            lines.append("⚠️ **Past expected harvest date** — harvest immediately if not done.")
    else:
        lines.append(f"Total crop duration: ~{kb['duration_days']} days from sowing.")
        lines.append("Set your sowing date in FarmGPT settings for accurate harvest tracking.")

    lines.append(f"\n**Harvest readiness signs for {crop}:**")
    if crop_key == "tomato":
        lines.append("• Fruits turn red/yellow uniformly with slight give on pressing")
        lines.append("• For distant market: harvest at 'breaker' stage (25% color)")
        lines.append("• For local sale: harvest at 'turning' stage (50%+ color)")
    elif crop_key == "rice":
        lines.append("• 80% grains golden, panicle drooping")
        lines.append("• Grain moisture 20-22% (bite test: firm, slight crack)")
        lines.append("• Drain field 15 days before cutting")
    elif crop_key == "wheat":
        lines.append("• Grains hard, moisture <14% (teeth compression test)")
        lines.append("• Straw turns golden-brown, leaves fully dry")
        lines.append("• Harvest in morning to reduce grain shattering")
    else:
        lines.append("• Check crop-specific maturity indicators")
        lines.append("• Harvest at optimal moisture for best storage")

    return "\n".join(lines)


def generate_general_response(context, question):
    crop = context.get("crop", "your crop")
    city = context.get("city", "your area")
    stage = context.get("growth_stage", {})

    lines = [f"🌿 **FarmGPT Advisory**\n"]
    lines.append(f"I understand your question about: *\"{question}\"*\n")
    lines.append(f"Based on your farm profile ({crop} in {city}):\n")

    if stage.get("stage") and stage["stage"] != "Unknown":
        lines.append(f"📍 **Current crop stage:** {stage['stage']} (Day {stage.get('day', '?')})")
        lines.append(f"💡 **Recommended care:** {stage.get('care', 'Continue regular monitoring.')}\n")

    lines.append("You can ask me about:")
    lines.append("• 🐛 Pest/disease management — *'How to control whitefly?'*")
    lines.append("• 💧 Irrigation schedule — *'When should I irrigate?'*")
    lines.append("• 🧪 Fertilizer advice — *'What fertilizer for flowering stage?'*")
    lines.append("• 🌤️ Weather impact — *'Is it safe to spray today?'*")
    lines.append("• 📈 Market prices — *'When should I sell my crop?'*")
    lines.append("• 🌾 Harvest timing — *'Is my crop ready to harvest?'*")
    lines.append("\n⚠️ *Advisory only — always verify with your local agronomist for critical decisions.*")
    return "\n".join(lines)


def generate_sowing_response(context, question):
    crop_key = context.get("crop_key", "tomato")
    crop = context.get("crop", "Your Crop")
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)

    lines = [f"🌱 **Sowing Advisory for {crop}** ({kb.get('scientific', '')})\n"]
    lines.append(f"**Recommended seasons:** {', '.join(s.title() for s in kb.get('season', []))}")
    lines.append(f"**Crop duration:** {kb['duration_days']} days")
    lines.append(f"**Optimal temperature:** {kb['optimal_temp'][0]}-{kb['optimal_temp'][1]}°C")
    lines.append(f"**Water requirement:** {kb['optimal_rain_mm'][0]}-{kb['optimal_rain_mm'][1]} mm total\n")

    lines.append("**Pre-sowing checklist:**")
    lines.append("1. Deep plough + 2 harrowing for fine tilth")
    lines.append("2. Soil test (if not done in last 6 months)")
    lines.append("3. Seed treatment with recommended fungicide")
    lines.append("4. Apply basal fertilizer before sowing")
    lines.append(f"5. Ensure irrigation available every {kb['irrigation_interval_days']} days")

    return "\n".join(lines)


def generate_soil_response(context, question):
    soil = context.get("soil_health", {})
    lines = ["🏔️ **Soil Health Advisory**\n"]

    if soil:
        lines.append("**Your soil test results:**")
        for k, v in soil.items():
            lines.append(f"• {k.title()}: {v}")
    else:
        lines.append("No soil test data available. Get your soil tested at your nearest KVK (Krishi Vigyan Kendra).")
        lines.append("\n**How to get a free soil health card:**")
        lines.append("1. Visit https://soilhealth.dac.gov.in")
        lines.append("2. Register with your Aadhaar number")
        lines.append("3. Collect soil sample (V-shape, 15cm depth from 5 spots)")
        lines.append("4. Submit to nearest soil testing lab")
        lines.append("5. Get report in 2-3 weeks with nutrient recommendations")

    return "\n".join(lines)


def generate_profit_response(context, question):
    crop = context.get("crop", "Your Crop")
    farm_size = context.get("farm_size", 2)

    lines = [f"💰 **Profitability Analysis for {crop}**\n"]
    lines.append("Use the Expense Tracker in AgroVision to track all your costs and revenues.")
    lines.append(f"\n**For a {farm_size}-acre {crop} farm (estimated):**")
    lines.append("Track these cost categories:")
    lines.append("• Seeds, Fertilizer, Pesticide, Labor, Fuel, Equipment, Transport, Packaging")
    lines.append("\n💡 **Profit optimization tips:**")
    lines.append("• Switch to drip irrigation — saves 30% water cost")
    lines.append("• Use Integrated Pest Management (IPM) — reduces pesticide cost by 40%")
    lines.append("• Grade produce before selling — Grade A fetches 15-20% premium")
    lines.append("• Sell directly to processors/exporters — bypass middlemen for 10-25% more")

    return "\n".join(lines)


def generate_scheme_response(context, question):
    state = context.get("state", "")
    lines = ["🏛️ **Government Schemes for Farmers**\n"]
    lines.append("**Major schemes you may be eligible for:**\n")
    lines.append("1. **PM-KISAN** — ₹6,000/year (₹2,000 × 3 installments)")
    lines.append("   Status: https://pmkisan.gov.in → Beneficiary Status")
    lines.append("\n2. **PMFBY** (Crop Insurance) — Premium: 2% Kharif, 1.5% Rabi")
    lines.append("   Apply via bank/CSC before sowing season deadline")
    lines.append("\n3. **KCC** (Kisan Credit Card) — Up to ₹3 lakh @ 4% interest")
    lines.append("   Apply at any nationalized bank with land documents")
    lines.append("\n4. **Soil Health Card Scheme** — Free soil testing")
    lines.append("   Register at https://soilhealth.dac.gov.in")
    lines.append("\n5. **PM Krishi Sinchayee Yojana** — Drip/sprinkler subsidy 55-75%")

    if state:
        lines.append(f"\n📍 Check {state}-specific schemes at your District Agriculture Office.")

    lines.append("\n💡 Visit the Government Schemes page in AgroVision for full details & eligibility check.")
    return "\n".join(lines)


# ── Main orchestrator ──

def process_question(question, context_json):
    """Main entry: process farmer question with full farm context."""
    context = json.loads(context_json) if isinstance(context_json, str) else context_json

    # Normalize crop key
    crop_raw = (context.get("crop", "") or "").strip().lower()
    crop_key = crop_raw if crop_raw in CROP_KB else "tomato"
    context["crop_key"] = crop_key
    context["crop"] = context.get("crop", crop_raw.title() or "Your Crop")

    # Weather interpretation
    if context.get("weather"):
        context["weather_insights"] = interpret_weather(context["weather"])

    # Growth stage
    context["growth_stage"] = get_growth_stage(crop_key, context.get("sowingDate"))

    # Detect intent & route
    intent = detect_intent(question)

    response_map = {
        "greeting": lambda: generate_greeting(context),
        "pest_management": lambda: generate_pest_response(context, question),
        "disease_management": lambda: generate_disease_response(context, question),
        "irrigation": lambda: generate_irrigation_response(context, question),
        "fertilizer": lambda: generate_fertilizer_response(context, question),
        "weather_advice": lambda: generate_weather_response(context, question),
        "market_advice": lambda: generate_market_response(context, question),
        "harvest_advice": lambda: generate_harvest_response(context, question),
        "sowing_advice": lambda: generate_sowing_response(context, question),
        "soil_advice": lambda: generate_soil_response(context, question),
        "profit_advice": lambda: generate_profit_response(context, question),
        "scheme_advice": lambda: generate_scheme_response(context, question),
        "general": lambda: generate_general_response(context, question),
    }

    generator = response_map.get(intent, response_map["general"])
    answer = generator()

    return json.dumps({
        "success": True,
        "intent": intent,
        "response": answer,
        "context_used": {
            "crop": context.get("crop"),
            "stage": context.get("growth_stage", {}).get("stage"),
            "weather_risk": context.get("weather_insights", {}).get("risk_level"),
            "day_in_crop": context.get("growth_stage", {}).get("day")
        },
        "disclaimer": "Advisory only — verify with your local agronomist for critical decisions."
    })


# ── CLI entry point ──
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: farmgpt_engine.py <question> <context_json>"}))
        sys.exit(1)

    question = sys.argv[1]
    ctx = sys.argv[2]

    try:
        result = process_question(question, ctx)
        print(result)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
