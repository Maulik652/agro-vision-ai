"""
FarmGPT Engine v2 — AgroVision AI
Accurate, context-aware agricultural intelligence.
Covers: 15+ crops, pests, diseases, irrigation, fertilizer,
weather, market, harvest, soil, schemes, general agri Q&A.
"""
import json, sys, re
from datetime import datetime, timedelta

# ── Crop Knowledge Base ──────────────────────────────────────────────────────
CROP_KB = {
    "tomato": {
        "scientific": "Solanum lycopersicum", "season": ["kharif","rabi"],
        "duration_days": 120, "optimal_temp": (20,30),
        "optimal_rain_mm": (600,1200), "optimal_humidity": (50,70),
        "major_pests": ["whitefly","fruit borer","aphids","leaf miner","thrips"],
        "major_diseases": ["early blight","late blight","bacterial wilt","leaf curl","fusarium wilt"],
        "nutrients": {"N":120,"P":60,"K":80},
        "irrigation_interval_days": 5,
        "growth_stages": [
            {"stage":"Germination","day_range":(0,15),"care":"Maintain 25-30°C, keep soil moist"},
            {"stage":"Vegetative","day_range":(15,45),"care":"Apply nitrogen, stake plants"},
            {"stage":"Flowering","day_range":(45,70),"care":"Reduce N, increase K, monitor pests"},
            {"stage":"Fruiting","day_range":(70,100),"care":"Regular irrigation, calcium spray"},
            {"stage":"Ripening","day_range":(100,120),"care":"Reduce irrigation, watch cracking"}
        ],
        "pesticide_guide": {
            "whitefly":"Imidacloprid 17.8% SL @ 0.3ml/L or Neem oil 5ml/L",
            "fruit borer":"Spinosad 45% SC @ 0.3ml/L + pheromone traps",
            "aphids":"Thiamethoxam 25% WG @ 0.3g/L",
            "leaf miner":"Abamectin 1.8% EC @ 0.5ml/L",
            "thrips":"Fipronil 5% SC @ 1.5ml/L"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Basal","npk":"20:20:20","dose":"50kg/acre"},
            {"day":25,"type":"Top dress","npk":"Urea","dose":"25kg/acre"},
            {"day":45,"type":"Flowering boost","npk":"0:52:34","dose":"2g/L spray"},
            {"day":70,"type":"Fruiting","npk":"13:0:45","dose":"3g/L spray"}
        ]
    },
    "rice": {
        "scientific": "Oryza sativa", "season": ["kharif"],
        "duration_days": 140, "optimal_temp": (22,32),
        "optimal_rain_mm": (1000,2000), "optimal_humidity": (60,80),
        "major_pests": ["stem borer","brown planthopper","leaf folder","gall midge","hispa"],
        "major_diseases": ["blast","sheath blight","bacterial leaf blight","tungro","false smut"],
        "nutrients": {"N":100,"P":50,"K":50},
        "irrigation_interval_days": 3,
        "growth_stages": [
            {"stage":"Nursery","day_range":(0,25),"care":"Seed treatment, 2-3cm water"},
            {"stage":"Transplanting","day_range":(25,35),"care":"3 seedlings/hill, 20x15cm spacing"},
            {"stage":"Tillering","day_range":(35,65),"care":"Top dress urea, 5cm water"},
            {"stage":"Panicle Initiation","day_range":(65,90),"care":"Apply K, monitor blast"},
            {"stage":"Grain Filling","day_range":(90,120),"care":"Maintain water, bird scarer"},
            {"stage":"Maturity","day_range":(120,140),"care":"Drain 15 days before harvest"}
        ],
        "pesticide_guide": {
            "stem borer":"Cartap hydrochloride 4G @ 25kg/ha in standing water",
            "brown planthopper":"Pymetrozine 50% WG @ 0.3g/L, drain excess water",
            "leaf folder":"Chlorantraniliprole 18.5% SC @ 0.3ml/L",
            "blast":"Tricyclazole 75% WP @ 0.6g/L at boot leaf stage",
            "sheath blight":"Hexaconazole 5% EC @ 2ml/L"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Basal","npk":"DAP+MOP","dose":"50kg+25kg/acre"},
            {"day":21,"type":"1st top dress","npk":"Urea","dose":"35kg/acre"},
            {"day":42,"type":"2nd top dress","npk":"Urea","dose":"35kg/acre"},
            {"day":65,"type":"Panicle boost","npk":"MOP","dose":"25kg/acre"}
        ]
    },
    "wheat": {
        "scientific": "Triticum aestivum", "season": ["rabi"],
        "duration_days": 135, "optimal_temp": (15,25),
        "optimal_rain_mm": (400,650), "optimal_humidity": (40,60),
        "major_pests": ["aphids","termites","army worm","pink stem borer"],
        "major_diseases": ["yellow rust","brown rust","karnal bunt","powdery mildew","loose smut"],
        "nutrients": {"N":120,"P":60,"K":40},
        "irrigation_interval_days": 20,
        "growth_stages": [
            {"stage":"Sowing","day_range":(0,7),"care":"Seed rate 40kg/acre, treat with Thiram"},
            {"stage":"CRI Stage","day_range":(18,25),"care":"Critical irrigation, 1st nitrogen"},
            {"stage":"Tillering","day_range":(25,50),"care":"2nd irrigation, weed control"},
            {"stage":"Jointing","day_range":(50,70),"care":"3rd irrigation, 2nd urea top dress"},
            {"stage":"Flowering","day_range":(70,90),"care":"4th irrigation, monitor rust"},
            {"stage":"Grain Fill","day_range":(90,120),"care":"5th irrigation, no nitrogen"},
            {"stage":"Maturity","day_range":(120,135),"care":"Stop irrigation, plan harvest"}
        ],
        "pesticide_guide": {
            "aphids":"Dimethoate 30% EC @ 1.5ml/L",
            "termites":"Chlorpyrifos 20% EC soil drench @ 4ml/L",
            "yellow rust":"Propiconazole 25% EC @ 1ml/L — spray immediately",
            "powdery mildew":"Sulfur 80% WP @ 3g/L",
            "karnal bunt":"Tebuconazole 2% DS seed treatment @ 1.5g/kg"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Basal","npk":"DAP","dose":"50kg/acre"},
            {"day":21,"type":"1st top dress (CRI)","npk":"Urea","dose":"40kg/acre"},
            {"day":50,"type":"2nd top dress","npk":"Urea","dose":"30kg/acre"}
        ]
    },
    "cotton": {
        "scientific": "Gossypium hirsutum", "season": ["kharif"],
        "duration_days": 180, "optimal_temp": (25,35),
        "optimal_rain_mm": (600,1000), "optimal_humidity": (50,65),
        "major_pests": ["bollworm","whitefly","jassids","thrips","pink bollworm","mealybug"],
        "major_diseases": ["bacterial blight","fusarium wilt","root rot","grey mildew","alternaria blight"],
        "nutrients": {"N":80,"P":40,"K":40},
        "irrigation_interval_days": 14,
        "growth_stages": [
            {"stage":"Germination","day_range":(0,15),"care":"Seed treatment, maintain moisture"},
            {"stage":"Vegetative","day_range":(15,50),"care":"Thinning, first nitrogen dose"},
            {"stage":"Squaring","day_range":(50,75),"care":"Monitor bollworm, install traps"},
            {"stage":"Flowering","day_range":(75,110),"care":"Peak water need, spray schedule"},
            {"stage":"Boll Development","day_range":(110,150),"care":"K spray, pink bollworm vigil"},
            {"stage":"Boll Opening","day_range":(150,180),"care":"Defoliant if needed, plan picking"}
        ],
        "pesticide_guide": {
            "bollworm":"Emamectin benzoate 5% SG @ 0.4g/L",
            "whitefly":"Diafenthiuron 50% WP @ 1g/L",
            "jassids":"Flonicamid 50% WG @ 0.3g/L",
            "pink bollworm":"Pheromone traps + Chlorantraniliprole 18.5% SC @ 0.3ml/L",
            "mealybug":"Profenofos 50% EC @ 2ml/L + Neem oil 5ml/L"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Basal","npk":"SSP+MOP","dose":"50kg+20kg/acre"},
            {"day":30,"type":"1st top dress","npk":"Urea","dose":"25kg/acre"},
            {"day":60,"type":"2nd top dress","npk":"Urea","dose":"25kg/acre"},
            {"day":90,"type":"Boll boost","npk":"MOP spray 1%","dose":"10g/L"}
        ]
    },
    "maize": {
        "scientific": "Zea mays", "season": ["kharif","rabi"],
        "duration_days": 110, "optimal_temp": (21,30),
        "optimal_rain_mm": (500,800), "optimal_humidity": (50,70),
        "major_pests": ["fall armyworm","stem borer","aphids","shoot fly","corn earworm"],
        "major_diseases": ["maydis leaf blight","downy mildew","stalk rot","common rust","northern corn leaf blight"],
        "nutrients": {"N":120,"P":60,"K":40},
        "irrigation_interval_days": 8,
        "growth_stages": [
            {"stage":"Germination","day_range":(0,10),"care":"Seed treatment Thiram+Imidacloprid"},
            {"stage":"Vegetative","day_range":(10,40),"care":"Nitrogen top dress, monitor armyworm"},
            {"stage":"Tasseling","day_range":(40,55),"care":"Critical irrigation period"},
            {"stage":"Silking","day_range":(55,70),"care":"Maximum water need, pollination"},
            {"stage":"Grain Fill","day_range":(70,95),"care":"Maintain moisture, stalk rot watch"},
            {"stage":"Maturity","day_range":(95,110),"care":"Black layer check, plan harvest"}
        ],
        "pesticide_guide": {
            "fall armyworm":"Spinetoram 11.7% SC @ 0.5ml/L or Emamectin benzoate 5% SG @ 0.4g/L",
            "stem borer":"Carbofuran 3G granules in whorl @ 8kg/acre",
            "downy mildew":"Metalaxyl 35% WS seed treatment @ 6g/kg",
            "common rust":"Mancozeb 75% WP @ 2.5g/L"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Basal","npk":"DAP+MOP","dose":"50kg+30kg/acre"},
            {"day":25,"type":"1st top dress","npk":"Urea","dose":"40kg/acre"},
            {"day":45,"type":"2nd top dress","npk":"Urea","dose":"40kg/acre"}
        ]
    },
    "soybean": {
        "scientific": "Glycine max", "season": ["kharif"],
        "duration_days": 100, "optimal_temp": (20,30),
        "optimal_rain_mm": (500,750), "optimal_humidity": (55,70),
        "major_pests": ["stem fly","girdle beetle","tobacco caterpillar","pod borer","whitefly"],
        "major_diseases": ["yellow mosaic","charcoal rot","bacterial pustule","rust","pod blight"],
        "nutrients": {"N":20,"P":60,"K":40},
        "irrigation_interval_days": 12,
        "growth_stages": [
            {"stage":"Germination","day_range":(0,10),"care":"Rhizobium seed inoculation"},
            {"stage":"Vegetative","day_range":(10,35),"care":"Weed management critical"},
            {"stage":"Flowering","day_range":(35,55),"care":"Micronutrient spray, pest monitoring"},
            {"stage":"Pod Filling","day_range":(55,80),"care":"Foliar fertilizer, irrigation if dry"},
            {"stage":"Maturity","day_range":(80,100),"care":"Leaves yellowing = ready to harvest"}
        ],
        "pesticide_guide": {
            "stem fly":"Thiamethoxam 30% FS seed treatment",
            "tobacco caterpillar":"Chlorantraniliprole 18.5% SC @ 0.3ml/L",
            "yellow mosaic":"Whitefly vector control + resistant variety",
            "rust":"Tebuconazole 25.9% EC @ 1ml/L"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Basal","npk":"SSP+MOP","dose":"50kg+20kg/acre"},
            {"day":35,"type":"Foliar spray","npk":"DAP 2%","dose":"20g/L"}
        ]
    },
    "groundnut": {
        "scientific": "Arachis hypogaea", "season": ["kharif","rabi"],
        "duration_days": 110, "optimal_temp": (22,30),
        "optimal_rain_mm": (500,750), "optimal_humidity": (50,65),
        "major_pests": ["aphids","leaf miner","white grub","tobacco caterpillar","thrips"],
        "major_diseases": ["tikka disease","collar rot","stem rot","rust","bud necrosis"],
        "nutrients": {"N":20,"P":40,"K":50},
        "irrigation_interval_days": 10,
        "growth_stages": [
            {"stage":"Germination","day_range":(0,12),"care":"Seed treatment with Trichoderma"},
            {"stage":"Vegetative","day_range":(12,35),"care":"Weed control, Gypsum application"},
            {"stage":"Flowering","day_range":(35,55),"care":"Critical irrigation, calcium for pegs"},
            {"stage":"Pegging","day_range":(55,75),"care":"Earthing up, maintain soil moisture"},
            {"stage":"Pod Filling","day_range":(75,95),"care":"No waterlogging, foliar boron"},
            {"stage":"Maturity","day_range":(95,110),"care":"Pull test — 75% pods mature = harvest"}
        ],
        "pesticide_guide": {
            "tikka disease":"Mancozeb 75% WP @ 2.5g/L at 35, 50, 65 DAS",
            "collar rot":"Carbendazim 2g/kg + Trichoderma seed treatment",
            "white grub":"Phorate 10G @ 10kg/acre at sowing"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Basal","npk":"SSP+Gypsum","dose":"100kg SSP+200kg Gypsum/acre"},
            {"day":35,"type":"Pegging","npk":"Gypsum top dress","dose":"100kg/acre"}
        ]
    },
    "sugarcane": {
        "scientific": "Saccharum officinarum", "season": ["kharif","rabi"],
        "duration_days": 365, "optimal_temp": (24,35),
        "optimal_rain_mm": (1500,2500), "optimal_humidity": (60,80),
        "major_pests": ["top borer","internode borer","pyrilla","woolly aphid","scale insect"],
        "major_diseases": ["red rot","smut","wilt","grassy shoot","ratoon stunting"],
        "nutrients": {"N":250,"P":80,"K":120},
        "irrigation_interval_days": 10,
        "growth_stages": [
            {"stage":"Germination","day_range":(0,35),"care":"Sett treatment, maintain moisture"},
            {"stage":"Tillering","day_range":(35,120),"care":"Gap filling, weed control, N application"},
            {"stage":"Grand Growth","day_range":(120,270),"care":"Peak irrigation, earthing up"},
            {"stage":"Maturity","day_range":(270,365),"care":"Stop irrigation 30 days before harvest"}
        ],
        "pesticide_guide": {
            "top borer":"Chlorantraniliprole 18.5% SC @ 0.3ml/L",
            "pyrilla":"Neem oil 5ml/L or Chlorpyrifos 20% EC @ 2ml/L",
            "red rot":"Resistant variety + Carbendazim sett treatment"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Basal","npk":"SSP+MOP","dose":"100kg+50kg/acre"},
            {"day":45,"type":"1st top dress","npk":"Urea","dose":"50kg/acre"},
            {"day":90,"type":"2nd top dress","npk":"Urea","dose":"50kg/acre"},
            {"day":150,"type":"3rd top dress","npk":"Urea+MOP","dose":"50kg+25kg/acre"}
        ]
    },
    "potato": {
        "scientific": "Solanum tuberosum", "season": ["rabi"],
        "duration_days": 90, "optimal_temp": (15,22),
        "optimal_rain_mm": (400,600), "optimal_humidity": (60,75),
        "major_pests": ["aphids","potato tuber moth","white grub","cutworm"],
        "major_diseases": ["late blight","early blight","black scurf","common scab","bacterial wilt"],
        "nutrients": {"N":120,"P":80,"K":120},
        "irrigation_interval_days": 7,
        "growth_stages": [
            {"stage":"Sprouting","day_range":(0,20),"care":"Seed treatment, 15cm depth planting"},
            {"stage":"Vegetative","day_range":(20,45),"care":"Earthing up, nitrogen top dress"},
            {"stage":"Tuber Initiation","day_range":(45,65),"care":"Critical irrigation, K application"},
            {"stage":"Tuber Bulking","day_range":(65,80),"care":"Maintain moisture, late blight watch"},
            {"stage":"Maturity","day_range":(80,90),"care":"Stop irrigation, haulm killing"}
        ],
        "pesticide_guide": {
            "late blight":"Metalaxyl+Mancozeb 72% WP @ 2.5g/L — spray every 7 days",
            "aphids":"Imidacloprid 17.8% SL @ 0.3ml/L",
            "potato tuber moth":"Spinosad 45% SC @ 0.3ml/L"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Basal","npk":"DAP+MOP","dose":"75kg+60kg/acre"},
            {"day":30,"type":"Top dress","npk":"Urea","dose":"40kg/acre"},
            {"day":50,"type":"Tuber boost","npk":"MOP","dose":"25kg/acre"}
        ]
    },
    "onion": {
        "scientific": "Allium cepa", "season": ["rabi","kharif"],
        "duration_days": 120, "optimal_temp": (13,24),
        "optimal_rain_mm": (350,550), "optimal_humidity": (50,70),
        "major_pests": ["thrips","onion fly","stem nematode","mites"],
        "major_diseases": ["purple blotch","stemphylium blight","downy mildew","basal rot","neck rot"],
        "nutrients": {"N":100,"P":50,"K":60},
        "irrigation_interval_days": 8,
        "growth_stages": [
            {"stage":"Nursery","day_range":(0,40),"care":"Seed treatment, thin sowing"},
            {"stage":"Transplanting","day_range":(40,55),"care":"10x10cm spacing, light irrigation"},
            {"stage":"Vegetative","day_range":(55,90),"care":"Nitrogen top dress, weed control"},
            {"stage":"Bulb Formation","day_range":(90,110),"care":"Reduce N, increase K, reduce water"},
            {"stage":"Maturity","day_range":(110,120),"care":"Stop irrigation, neck fall = harvest"}
        ],
        "pesticide_guide": {
            "thrips":"Fipronil 5% SC @ 1.5ml/L or Spinosad 45% SC @ 0.3ml/L",
            "purple blotch":"Iprodione 50% WP @ 2g/L",
            "downy mildew":"Metalaxyl+Mancozeb 72% WP @ 2.5g/L"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Basal","npk":"SSP+MOP","dose":"50kg+30kg/acre"},
            {"day":30,"type":"1st top dress","npk":"Urea","dose":"25kg/acre"},
            {"day":60,"type":"2nd top dress","npk":"Urea","dose":"25kg/acre"}
        ]
    },
    "chilli": {
        "scientific": "Capsicum annuum", "season": ["kharif","rabi"],
        "duration_days": 150, "optimal_temp": (20,30),
        "optimal_rain_mm": (600,1200), "optimal_humidity": (50,70),
        "major_pests": ["thrips","mites","aphids","fruit borer","whitefly"],
        "major_diseases": ["anthracnose","bacterial wilt","leaf curl","powdery mildew","damping off"],
        "nutrients": {"N":100,"P":50,"K":60},
        "irrigation_interval_days": 6,
        "growth_stages": [
            {"stage":"Nursery","day_range":(0,30),"care":"Seed treatment, shade net"},
            {"stage":"Transplanting","day_range":(30,45),"care":"45x45cm spacing"},
            {"stage":"Vegetative","day_range":(45,75),"care":"Nitrogen top dress, staking"},
            {"stage":"Flowering","day_range":(75,100),"care":"Boron spray, pest monitoring"},
            {"stage":"Fruiting","day_range":(100,150),"care":"Regular harvest, K spray"}
        ],
        "pesticide_guide": {
            "thrips":"Spinosad 45% SC @ 0.3ml/L",
            "anthracnose":"Carbendazim 50% WP @ 1g/L",
            "leaf curl":"Imidacloprid 17.8% SL @ 0.3ml/L (vector control)",
            "mites":"Abamectin 1.8% EC @ 0.5ml/L"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Basal","npk":"DAP+MOP","dose":"50kg+25kg/acre"},
            {"day":30,"type":"Top dress","npk":"Urea","dose":"25kg/acre"},
            {"day":60,"type":"Flowering","npk":"0:52:34","dose":"2g/L spray"}
        ]
    },
    "banana": {
        "scientific": "Musa spp.", "season": ["kharif","rabi"],
        "duration_days": 365, "optimal_temp": (20,35),
        "optimal_rain_mm": (1200,2200), "optimal_humidity": (60,80),
        "major_pests": ["banana weevil","nematodes","thrips","aphids","banana skipper"],
        "major_diseases": ["panama wilt","sigatoka","bunchy top","heart rot","crown rot"],
        "nutrients": {"N":200,"P":60,"K":300},
        "irrigation_interval_days": 5,
        "growth_stages": [
            {"stage":"Establishment","day_range":(0,60),"care":"Sucker selection, gap filling"},
            {"stage":"Vegetative","day_range":(60,180),"care":"Regular fertilizer, desuckering"},
            {"stage":"Shooting","day_range":(180,240),"care":"Bunch support, propping"},
            {"stage":"Bunch Development","day_range":(240,330),"care":"Bunch cover, K application"},
            {"stage":"Harvest","day_range":(330,365),"care":"75% maturity, cut with 30cm stalk"}
        ],
        "pesticide_guide": {
            "banana weevil":"Chlorpyrifos 20% EC @ 4ml/L soil drench",
            "sigatoka":"Propiconazole 25% EC @ 1ml/L spray",
            "bunchy top":"Remove infected plants, control aphid vector"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Planting","npk":"FYM","dose":"10kg/plant"},
            {"day":60,"type":"1st dose","npk":"Urea+MOP","dose":"100g+150g/plant"},
            {"day":120,"type":"2nd dose","npk":"Urea+MOP","dose":"100g+150g/plant"},
            {"day":180,"type":"3rd dose","npk":"Urea+MOP","dose":"100g+150g/plant"}
        ]
    },
    "mango": {
        "scientific": "Mangifera indica", "season": ["rabi"],
        "duration_days": 365, "optimal_temp": (24,30),
        "optimal_rain_mm": (750,1250), "optimal_humidity": (50,70),
        "major_pests": ["mango hopper","fruit fly","mealybug","stem borer","scale insect"],
        "major_diseases": ["powdery mildew","anthracnose","bacterial canker","malformation","sooty mould"],
        "nutrients": {"N":500,"P":200,"K":500},
        "irrigation_interval_days": 15,
        "growth_stages": [
            {"stage":"Dormancy","day_range":(0,60),"care":"Pruning, copper spray"},
            {"stage":"Flowering","day_range":(60,120),"care":"Powdery mildew control, hopper spray"},
            {"stage":"Fruit Set","day_range":(120,180),"care":"Thinning, irrigation"},
            {"stage":"Fruit Development","day_range":(180,300),"care":"Fruit fly traps, K spray"},
            {"stage":"Harvest","day_range":(300,365),"care":"Harvest at 3/4 maturity"}
        ],
        "pesticide_guide": {
            "mango hopper":"Imidacloprid 17.8% SL @ 0.3ml/L at flowering",
            "fruit fly":"Methyl eugenol traps + Malathion bait spray",
            "powdery mildew":"Sulfur 80% WP @ 3g/L or Hexaconazole 5% EC @ 2ml/L",
            "mealybug":"Chlorpyrifos 20% EC @ 2ml/L + sticky band on trunk"
        },
        "fertilizer_schedule": [
            {"day":0,"type":"Post harvest","npk":"FYM+NPK","dose":"50kg FYM+1kg NPK/tree"},
            {"day":180,"type":"Pre-flowering","npk":"Urea+MOP","dose":"500g+500g/tree"}
        ]
    }
}

DEFAULT_CROP_KB = {
    "scientific": "Unknown", "season": ["kharif","rabi"],
    "duration_days": 120, "optimal_temp": (20,30),
    "optimal_rain_mm": (500,1000), "optimal_humidity": (50,70),
    "major_pests": ["aphids","caterpillars","whitefly","mites"],
    "major_diseases": ["fungal blight","wilt","leaf spot","rust"],
    "nutrients": {"N":80,"P":50,"K":40},
    "irrigation_interval_days": 7,
    "growth_stages": [
        {"stage":"Early Growth","day_range":(0,40),"care":"Monitor establishment, weed control"},
        {"stage":"Mid Season","day_range":(40,80),"care":"Nutrient management, pest monitoring"},
        {"stage":"Late Season","day_range":(80,120),"care":"Prepare for harvest, reduce irrigation"}
    ],
    "pesticide_guide": {},
    "fertilizer_schedule": []
}

# ── General Agriculture Knowledge Base ──────────────────────────────────────
GENERAL_AGRI_KB = {
    "soil_ph": {
        "acidic": "pH < 6.0 — Apply agricultural lime (CaCO3) @ 2-4 tonnes/ha to raise pH. Acidic soils cause nutrient lockout.",
        "neutral": "pH 6.0-7.5 — Ideal for most crops. Nutrients are most available in this range.",
        "alkaline": "pH > 7.5 — Apply gypsum (CaSO4) @ 2-3 tonnes/ha or sulfur @ 200-500 kg/ha to lower pH."
    },
    "organic_matter": {
        "low": "< 0.5% — Apply FYM 10-15 tonnes/ha + green manure crops (dhaincha, sunhemp). Organic matter improves water retention and microbial activity.",
        "medium": "0.5-1.5% — Maintain with 5-8 tonnes/ha FYM annually.",
        "high": "> 1.5% — Excellent. Maintain with crop residue incorporation."
    },
    "drip_irrigation": "Drip irrigation saves 30-50% water vs flood irrigation. Suitable for vegetables, fruits, cotton. Subsidy available under PMKSY (55-75% for small farmers).",
    "ipm": "Integrated Pest Management (IPM): 1) Use resistant varieties, 2) Crop rotation, 3) Biological control (Trichogramma, NPV), 4) Pheromone traps, 5) Chemical as last resort. Reduces pesticide cost by 40%.",
    "organic_farming": "Organic certification takes 3 years. Use: Vermicompost (2-3 t/ha), Neem cake (200 kg/ha), Trichoderma (2.5 kg/ha), Pseudomonas (2.5 kg/ha), Jeevamrit, Panchagavya.",
    "seed_treatment": "Standard seed treatment: 1) Carbendazim 2g/kg (fungal), 2) Imidacloprid 5ml/kg (insect), 3) Rhizobium/Azotobacter (legumes), 4) Trichoderma 4g/kg (soil-borne diseases).",
    "crop_rotation": "Benefits: Breaks pest/disease cycle, improves soil fertility, reduces weed pressure. Example rotations: Rice→Wheat→Maize | Cotton→Wheat→Groundnut | Tomato→Onion→Maize",
    "intercropping": "Intercropping increases income by 20-40%. Examples: Maize+Soybean, Cotton+Groundnut, Sugarcane+Onion, Mango+Turmeric.",
    "post_harvest": "Post-harvest losses in India: 10-30%. Reduce by: 1) Harvest at right maturity, 2) Pre-cooling within 2 hours, 3) Grading and sorting, 4) Cold storage (0-4°C for most vegetables), 5) Proper packaging.",
    "cold_storage": "Cold storage temperature guide: Potato 2-4°C, Onion 0-2°C, Tomato 10-13°C, Mango 8-12°C, Banana 13-15°C, Apple 0-2°C.",
    "micronutrients": "Micronutrient deficiency symptoms: Zinc (white bud in maize, khaira in rice) — apply ZnSO4 25kg/ha. Boron (hollow stem, poor fruit set) — apply Borax 1g/L spray. Iron (interveinal chlorosis) — apply FeSO4 0.5% spray.",
    "bio_fertilizers": "Bio-fertilizers: Rhizobium (legumes, fixes 50-100 kg N/ha), Azotobacter (non-legumes, 20-30 kg N/ha), PSB (phosphate solubilizing, 30-40 kg P/ha), Mycorrhiza (improves P and water uptake).",
}

# ── Intent patterns ──────────────────────────────────────────────────────────
INTENT_PATTERNS = {
    r"pesticide|spray|pest|insect|bug|worm|borer|aphid|whitefly|thrips|mite|caterpillar|weevil|hopper|fly": "pest_management",
    r"disease|blight|wilt|rust|mildew|rot|fungal|fungus|yellow.*leaf|brown.*spot|mosaic|canker|smut|blast|scab": "disease_management",
    r"irrigat|when.*water|drip.*irrigat|sprinkler|flood.*irrigat|moisture.*level|drought": "irrigation",
    r"fertiliz|urea|dap|npk|nutrient|nitrogen|phosphorus|potassium|micronutrient|zinc|boron|iron": "fertilizer",
    r"weather|rain|temperature|forecast|humidity|wind|frost|hail|heat.*stress|cold.*stress|storm": "weather_advice",
    r"price|sell|market|mandi|rate|when.*sell|best.*time.*sell|buyer|demand": "market_advice",
    r"harvest|ready.*harvest|when.*harvest|yield|cutting|reaping|mature.*crop": "harvest_advice",
    r"seed|sow|plant.*variety|spacing|seed.*rate|nursery|transplant|germination|pre.*sow": "sowing_advice",
    r"organic.*farm|natural.*farm|bio.*fertilizer|vermicompost|jeevamrit|panchagavya|organic.*certif": "organic_advice",
    r"ipm|integrated.*pest|biological.*control|pheromone|trichogramma|biocontrol": "ipm_advice",
    r"storage|cold.*storage|post.*harvest|grading|packaging|warehouse|shelf.*life": "storage_advice",
    r"intercrop|mixed.*crop|companion.*crop|crop.*rotation|cropping.*system": "cropping_system_advice",
    r"soil|ph|organic.*matter|health.*card|soil.*test|loam|clay|sandy|saline|alkaline|acidic": "soil_advice",
    r"profit|cost|expense|income|earn|loss|budget|return|investment": "profit_advice",
    r"scheme|subsidy|pm.*kisan|insurance|government|loan|kcc|pmfby|kvk|krishi": "scheme_advice",
    r"water|dry|drought|moisture": "irrigation",
    r"hello|hi|good.*morning|hey|namaste|help|what.*can.*you": "greeting",
}

def detect_intent(question):
    q = question.lower().strip()
    for pattern, intent in INTENT_PATTERNS.items():
        if re.search(pattern, q):
            return intent
    return "general"

# ── Weather interpretation ───────────────────────────────────────────────────
def interpret_weather(weather):
    if not weather:
        return {"risk_level": "Unknown", "actions": ["Weather data unavailable — check manually."]}
    temp = weather.get("temperature", 25)
    humidity = weather.get("humidity", 60)
    rain_mm = weather.get("rainfall", 0)
    wind_kmh = weather.get("windSpeed", 10)
    risks, actions = [], []
    if temp > 40:
        risks.append("Extreme heat stress")
        actions.append(f"Temperature {temp}°C — provide shade nets, increase irrigation frequency by 50%.")
    elif temp > 35:
        risks.append("Heat stress")
        actions.append(f"High temperature {temp}°C — irrigate early morning (5-7 AM) to reduce evaporation.")
    elif temp < 5:
        risks.append("Severe frost risk")
        actions.append(f"CRITICAL: {temp}°C — smoke fires at field borders + overhead sprinkler if available.")
    elif temp < 10:
        risks.append("Frost risk")
        actions.append(f"Low temperature {temp}°C — cover seedlings with plastic mulch tonight.")
    if rain_mm > 50:
        risks.append("Heavy rainfall / waterlogging risk")
        actions.append(f"{rain_mm}mm rainfall expected — clear drainage channels. DO NOT spray pesticide today.")
    elif rain_mm > 20:
        actions.append(f"Moderate rain {rain_mm}mm expected — postpone foliar spray by 24-48 hours.")
    elif rain_mm == 0 and humidity < 40:
        actions.append("Dry conditions — good day for pesticide application (spray before 10 AM).")
    if humidity > 85:
        risks.append("Fungal disease risk HIGH")
        actions.append(f"Humidity {humidity}% — high fungal disease risk. Apply preventive fungicide.")
    elif humidity > 75:
        actions.append(f"Humidity {humidity}% — monitor for early blight/mildew symptoms.")
    if wind_kmh > 40:
        risks.append("Strong winds")
        actions.append(f"Wind {wind_kmh} km/h — secure staking. Avoid spraying.")
    elif wind_kmh > 25:
        actions.append(f"Moderate wind {wind_kmh} km/h — use low-drift nozzles if spraying.")
    if not actions:
        actions.append("Weather conditions are favorable. Proceed with planned farm activities.")
    return {
        "risk_level": "High" if len(risks) >= 2 else "Medium" if risks else "Low",
        "risks": risks, "actions": actions
    }

# ── Growth stage calculator ──────────────────────────────────────────────────
def get_growth_stage(crop_key, sowing_date_str):
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
        "stage": current_stage["stage"], "day": days_since,
        "totalDays": kb["duration_days"], "progress_pct": pct,
        "care": current_stage["care"],
        "estimatedHarvest": est_harvest.strftime("%Y-%m-%d"),
        "daysToHarvest": max(0, (est_harvest - datetime.now()).days)
    }


# ── Response generators ──────────────────────────────────────────────────────

def generate_greeting(context):
    hour = datetime.now().hour
    g = "Good morning" if hour < 12 else "Good afternoon" if hour < 17 else "Good evening"
    crop = context.get("crop", "your crops")
    stage = context.get("growth_stage", {})
    wi = context.get("weather_insights", {})
    lines = [f"{g}! Here's your farm briefing:\n"]
    if stage.get("stage") and stage["stage"] != "Unknown":
        lines.append(f"🌱 **{crop}** is in **{stage['stage']}** stage (Day {stage.get('day','?')}/{stage.get('totalDays','?')})")
        if stage.get("daysToHarvest", 0) > 0:
            lines.append(f"📅 Harvest in **{stage['daysToHarvest']} days** ({stage.get('estimatedHarvest','')})")
        lines.append(f"💡 Today's care: {stage.get('care','Monitor your crops regularly.')}")
    if wi.get("actions"):
        lines.append(f"\n🌤️ **Weather:** {wi['actions'][0]}")
    lines.append("\nAsk me about pests, diseases, irrigation, fertilizer, market prices, or harvest timing.")
    return "\n".join(lines)


def generate_pest_response(context, question):
    crop_key = context.get("crop_key", "")
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)
    weather = context.get("weather", {})
    humidity = weather.get("humidity", 60)
    temp = weather.get("temperature", 28)
    rain = weather.get("rainfall", 0)
    crop = context.get("crop", "Your Crop")
    lines = [f"🐛 **Pest Management — {crop}**\n"]
    q_lower = question.lower()
    specific = next((p for p in kb.get("major_pests", []) if p.lower() in q_lower), None)
    guide = kb.get("pesticide_guide", {})
    if specific and specific in guide:
        lines.append(f"**Treatment for {specific.title()}:**")
        lines.append(f"💊 {guide[specific]}")
    else:
        lines.append("**Major pests & recommended treatments:**")
        if guide:
            for pest, treatment in guide.items():
                lines.append(f"• **{pest.title()}**: {treatment}")
        else:
            lines.append("• Monitor regularly for aphids, caterpillars, and sucking pests")
            lines.append("• Use Neem oil 5ml/L as a broad-spectrum organic option")
            lines.append("• Install yellow sticky traps for early detection")
    if rain > 10:
        lines.append(f"\n⚠️ **DO NOT SPRAY** — {rain}mm rain expected. Wait 24-48 hours after rain.")
    elif humidity > 85:
        lines.append(f"\n⚠️ Humidity {humidity}% — spray early morning (6-8 AM) when dew dries.")
    elif temp > 35:
        lines.append(f"\n☀️ Temperature {temp}°C — spray in evening (4-6 PM) to avoid leaf burn.")
    else:
        lines.append(f"\n✅ Conditions (Temp: {temp}°C, Humidity: {humidity}%) are **good for spraying**. Best: 7-10 AM.")
    lines.append("\n⚠️ *Wear protective gear. Follow label dosage strictly. Observe pre-harvest interval.*")
    return "\n".join(lines)


def generate_disease_response(context, question):
    crop_key = context.get("crop_key", "")
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)
    humidity = context.get("weather", {}).get("humidity", 60)
    crop = context.get("crop", "Your Crop")
    lines = [f"🦠 **Disease Management — {crop}**\n"]
    scan = context.get("last_scan", {})
    if scan and scan.get("disease"):
        lines.append(f"📋 **Last scan:** {scan['disease']} (Confidence: {scan.get('confidence','N/A')}%, Severity: {scan.get('severity','Unknown')})\n")
    q_lower = question.lower()
    guide = kb.get("pesticide_guide", {})
    diseases = kb.get("major_diseases", [])
    specific = next((d for d in diseases if d.lower() in q_lower), None)
    if specific:
        lines.append(f"**{specific.title()} — Identification & Control:**")
        match = next((v for k, v in guide.items() if k.lower() in specific.lower() or specific.lower() in k.lower()), None)
        if match:
            lines.append(f"💊 {match}")
        else:
            lines.append("• Apply broad-spectrum fungicide: Mancozeb 75% WP @ 2.5g/L")
            lines.append("• Remove and destroy infected plant parts immediately")
    else:
        lines.append("**Major diseases for this crop:**")
        for d in diseases:
            lines.append(f"• {d.title()}")
    if humidity > 80:
        lines.append(f"\n🔴 **HIGH RISK**: Humidity {humidity}% — fungal diseases spread rapidly.")
        lines.append("**Immediate action:** Mancozeb 75% WP @ 2.5g/L or Copper oxychloride 50% WP @ 3g/L.")
    elif humidity > 65:
        lines.append(f"\n🟡 **MODERATE RISK**: Humidity {humidity}% — monitor for early symptoms.")
    else:
        lines.append(f"\n🟢 **LOW RISK**: Humidity {humidity}% — dry conditions, low disease pressure.")
    lines.append("\n**Prevention:**")
    lines.append("• Remove infected plant parts immediately")
    lines.append("• Maintain proper spacing for air circulation")
    lines.append("• Use drip irrigation — avoid wetting foliage")
    lines.append("• Rotate crops to break disease cycle")
    return "\n".join(lines)


def generate_irrigation_response(context, question):
    crop_key = context.get("crop_key", "")
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)
    weather = context.get("weather", {})
    temp = weather.get("temperature", 28)
    humidity = weather.get("humidity", 60)
    rain = weather.get("rainfall", 0)
    stage = context.get("growth_stage", {})
    crop = context.get("crop", "Your Crop")
    lines = [f"💧 **Irrigation Advisory — {crop}**\n"]
    interval = kb["irrigation_interval_days"]
    if temp > 35:
        interval = max(2, interval - 2)
        lines.append(f"🌡️ High temperature ({temp}°C) — irrigate every **{interval} days** (increased frequency).")
    elif temp < 15:
        interval = interval + 3
        lines.append(f"❄️ Cool weather ({temp}°C) — extend to every **{interval} days**.")
    else:
        lines.append(f"Standard interval: **every {interval} days** for {crop}.")
    if rain > 30:
        lines.append(f"\n🌧️ **Skip irrigation** — {rain}mm rainfall expected. Check soil in 2 days.")
    elif rain > 10:
        lines.append(f"\n🌦️ Light rain ({rain}mm) — delay irrigation by 1 day, then check soil.")
    et_mm = round(2.0 + (temp - 20) * 0.15 + (100 - humidity) * 0.02, 1)
    lines.append(f"\n📊 **Estimated crop water need:** {et_mm} mm/day")
    if stage.get("stage") and stage["stage"] != "Unknown":
        lines.append(f"🌱 **Current stage ({stage['stage']}):** {stage.get('care','')}")
    lines.append("\n**Best practices:**")
    lines.append("• Irrigate early morning (5-7 AM) — reduces evaporation by 30%")
    lines.append("• Drip irrigation saves 30-50% water vs flood irrigation")
    lines.append("• Mulching reduces water need by 25-30%")
    lines.append("• Check soil at 15cm depth — irrigate when dry to touch")
    return "\n".join(lines)


def generate_fertilizer_response(context, question):
    crop_key = context.get("crop_key", "")
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)
    stage = context.get("growth_stage", {})
    crop = context.get("crop", "Your Crop")
    lines = [f"🧪 **Fertilizer Advisory — {crop}**\n"]
    npk = kb.get("nutrients", {})
    lines.append(f"**Total requirement:** N: {npk.get('N',80)} kg/ha | P: {npk.get('P',50)} kg/ha | K: {npk.get('K',40)} kg/ha\n")
    schedule = kb.get("fertilizer_schedule", [])
    current_day = stage.get("day", 0)
    if schedule:
        lines.append("**Fertilizer Schedule:**")
        for e in schedule:
            if current_day > e["day"] + 5:
                marker = "✅"
            elif abs(current_day - e["day"]) <= 7:
                marker = "👉"
            else:
                marker = "⏳"
            lines.append(f"{marker} Day {e['day']}: {e['type']} — {e['npk']} @ {e['dose']}")
        upcoming = [e for e in schedule if e["day"] > current_day]
        if upcoming:
            nxt = upcoming[0]
            days_until = nxt["day"] - current_day
            lines.append(f"\n📅 **Next application in {days_until} days:** {nxt['type']} — {nxt['npk']} @ {nxt['dose']}")
    q_lower = question.lower()
    if "zinc" in q_lower or "micronutrient" in q_lower:
        lines.append(f"\n**Micronutrient tip:** Apply ZnSO4 @ 25 kg/ha basal or 0.5% foliar spray for zinc deficiency.")
    if "organic" in q_lower or "compost" in q_lower:
        lines.append(f"\n**Organic option:** FYM 10-15 t/ha + Vermicompost 2-3 t/ha reduces chemical fertilizer need by 25%.")
    lines.append("\n**General tips:**")
    lines.append("• Split nitrogen into 3 doses — reduces leaching loss by 40%")
    lines.append("• Apply fertilizer when soil is moist, not waterlogged")
    lines.append("• Foliar spray is 5-10x more efficient than soil application for micronutrients")
    return "\n".join(lines)


def generate_weather_response(context, question):
    weather = context.get("weather", {})
    insights = context.get("weather_insights", {})
    city = context.get("city", "Your Area")
    lines = [f"🌤️ **Weather Advisory — {city}**\n"]
    if weather:
        lines.append("**Current Conditions:**")
        lines.append(f"🌡️ Temperature: {weather.get('temperature','N/A')}°C")
        lines.append(f"💧 Humidity: {weather.get('humidity','N/A')}%")
        lines.append(f"🌧️ Rainfall: {weather.get('rainfall',0)} mm")
        lines.append(f"💨 Wind: {weather.get('windSpeed','N/A')} km/h")
        lines.append(f"☁️ Condition: {weather.get('condition','N/A')}")
    else:
        lines.append("No real-time weather data available. Check the Weather page for live conditions.")
    if insights:
        risk = insights.get("risk_level","Unknown")
        icon = "🔴" if risk == "High" else "🟡" if risk == "Medium" else "🟢"
        lines.append(f"\n**Farm Risk Level:** {icon} {risk}")
        if insights.get("actions"):
            lines.append("\n**Recommended Actions:**")
            for i, a in enumerate(insights["actions"], 1):
                lines.append(f"{i}. {a}")
    return "\n".join(lines)


def generate_market_response(context, question):
    crop = context.get("crop", "Your Crop")
    market = context.get("market", {})
    stage = context.get("growth_stage", {})
    lines = [f"📈 **Market Intelligence — {crop}**\n"]
    if market:
        if market.get("currentPrice"):
            lines.append(f"**Current Price:** ₹{market['currentPrice']}/quintal")
        if market.get("trend"):
            icon = "📈" if market["trend"] == "rising" else "📉" if market["trend"] == "falling" else "➡️"
            lines.append(f"**Trend:** {icon} {market['trend'].title()}")
        if market.get("predictedPriceWeek"):
            lines.append(f"**Next week forecast:** ₹{market['predictedPriceWeek']}/quintal")
        if market.get("predictedPriceMonth"):
            lines.append(f"**Next month forecast:** ₹{market['predictedPriceMonth']}/quintal")
        if stage.get("daysToHarvest", 0) > 0:
            lines.append(f"\n📅 Your harvest is ~{stage['daysToHarvest']} days away.")
            if market.get("trend") == "rising":
                lines.append("💡 Prices rising — consider holding 1-2 weeks post-harvest for better rates.")
            elif market.get("trend") == "falling":
                lines.append("💡 Prices declining — sell quickly after harvest. Pre-book buyers now.")
            else:
                lines.append("💡 Prices stable — sell when crop quality is at its best.")
    else:
        lines.append("No live market data available. Check the Marketplace page for current prices.")
        lines.append("\n**General selling tips:**")
        lines.append("• List on AgroVision marketplace 1 week before harvest")
        lines.append("• Grade produce (A/B/C) — Grade A fetches 15-20% premium")
        lines.append("• Compare prices across 3-4 nearby mandis before selling")
        lines.append("• Morning arrivals at mandi get better rates than afternoon")
        lines.append("• Sell directly to processors/exporters — bypass middlemen for 10-25% more")
    return "\n".join(lines)


def generate_harvest_response(context, question):
    crop_key = context.get("crop_key", "")
    crop = context.get("crop", "Your Crop")
    stage = context.get("growth_stage", {})
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)
    lines = [f"🌾 **Harvest Advisory — {crop}**\n"]
    if stage.get("stage") and stage["stage"] != "Unknown":
        lines.append(f"**Current Stage:** {stage['stage']} (Day {stage.get('day','?')}/{stage.get('totalDays','?')})")
        lines.append(f"**Progress:** {stage.get('progress_pct',0)}% complete")
        dth = stage.get("daysToHarvest", 0)
        if dth > 0:
            lines.append(f"**Estimated Harvest:** {stage.get('estimatedHarvest','TBD')} ({dth} days remaining)")
        elif dth == 0:
            lines.append("🟢 **Your crop is READY for harvest!**")
        else:
            lines.append("⚠️ **Past expected harvest date** — harvest immediately if not done.")
    else:
        lines.append(f"Total crop duration: ~{kb['duration_days']} days from sowing.")
        lines.append("Set your sowing date for accurate harvest tracking.")
    lines.append(f"\n**Harvest readiness signs for {crop}:**")
    signs = {
        "tomato": ["Fruits turn red/yellow uniformly with slight give on pressing",
                   "For distant market: harvest at 'breaker' stage (25% color)",
                   "For local sale: harvest at 'turning' stage (50%+ color)"],
        "rice": ["80% grains golden, panicle drooping",
                 "Grain moisture 20-22% (bite test: firm, slight crack)",
                 "Drain field 15 days before cutting"],
        "wheat": ["Grains hard, moisture <14% (teeth compression test)",
                  "Straw turns golden-brown, leaves fully dry",
                  "Harvest in morning to reduce grain shattering"],
        "cotton": ["Bolls fully open, white fluffy fiber visible",
                   "Pick every 7-10 days — don't let fiber over-mature",
                   "Harvest in dry weather to maintain fiber quality"],
        "maize": ["Black layer visible at kernel base (break a cob to check)",
                  "Husk turns brown and dry, kernels hard",
                  "Grain moisture 25-30% for combine harvest"],
        "potato": ["Skin set test — rub with thumb, skin doesn't peel = ready",
                   "Haulm (tops) turning yellow and dying back",
                   "Harvest in cool morning hours to avoid greening"],
        "onion": ["50-75% neck fall (tops falling over)",
                  "Outer skin turns papery and dry",
                  "Cure in field for 7-10 days before storage"],
        "sugarcane": ["Brix reading 18-20% (use refractometer)",
                      "Internodes turn yellowish, leaves dry at base",
                      "Harvest at 12-14 months for best sugar recovery"],
    }
    for sign in signs.get(crop_key, ["Check crop-specific maturity indicators",
                                      "Harvest at optimal moisture for best storage quality",
                                      "Consult local agronomist for variety-specific guidance"]):
        lines.append(f"• {sign}")
    lines.append("\n**Post-harvest tips:**")
    lines.append("• Pre-cool within 2 hours of harvest to extend shelf life")
    lines.append("• Grade and sort before selling — Grade A fetches 15-20% premium")
    lines.append("• Use cold storage if selling is delayed (see Storage page)")
    return "\n".join(lines)


def generate_sowing_response(context, question):
    crop_key = context.get("crop_key", "")
    crop = context.get("crop", "Your Crop")
    kb = CROP_KB.get(crop_key, DEFAULT_CROP_KB)
    lines = [f"🌱 **Sowing Advisory — {crop}** ({kb.get('scientific','')})\n"]
    lines.append(f"**Recommended seasons:** {', '.join(s.title() for s in kb.get('season',[]))}")
    lines.append(f"**Crop duration:** {kb['duration_days']} days")
    lines.append(f"**Optimal temperature:** {kb['optimal_temp'][0]}-{kb['optimal_temp'][1]}°C")
    lines.append(f"**Water requirement:** {kb['optimal_rain_mm'][0]}-{kb['optimal_rain_mm'][1]} mm total")
    lines.append(f"**Irrigation interval:** every {kb['irrigation_interval_days']} days\n")
    lines.append("**Pre-sowing checklist:**")
    lines.append("1. Deep plough + 2 harrowing for fine tilth")
    lines.append("2. Soil test (if not done in last 6 months)")
    lines.append("3. Seed treatment: Carbendazim 2g/kg + Imidacloprid 5ml/kg")
    lines.append("4. Apply basal fertilizer before sowing")
    lines.append(f"5. Ensure irrigation available every {kb['irrigation_interval_days']} days")
    lines.append("6. Check weather forecast — avoid sowing before heavy rain")
    return "\n".join(lines)


def generate_soil_response(context, question):
    soil = context.get("soil_health", {})
    q_lower = question.lower()
    lines = ["🏔️ **Soil Health Advisory**\n"]
    if soil:
        lines.append("**Your soil test results:**")
        for k, v in soil.items():
            lines.append(f"• {k.title()}: {v}")
        lines.append("")
    if "ph" in q_lower or "acid" in q_lower or "alkaline" in q_lower:
        lines.append("**Soil pH Management:**")
        lines.append(f"• {GENERAL_AGRI_KB['soil_ph']['acidic']}")
        lines.append(f"• {GENERAL_AGRI_KB['soil_ph']['neutral']}")
        lines.append(f"• {GENERAL_AGRI_KB['soil_ph']['alkaline']}")
    elif "organic" in q_lower:
        lines.append("**Organic Matter Management:**")
        for k, v in GENERAL_AGRI_KB["organic_matter"].items():
            lines.append(f"• {k.title()}: {v}")
    else:
        lines.append("**How to get a free Soil Health Card:**")
        lines.append("1. Visit https://soilhealth.dac.gov.in")
        lines.append("2. Register with your Aadhaar number")
        lines.append("3. Collect soil sample (V-shape, 15cm depth from 5 spots in field)")
        lines.append("4. Submit to nearest soil testing lab")
        lines.append("5. Get report in 2-3 weeks with nutrient recommendations")
        lines.append("\n**Ideal soil parameters for most crops:**")
        lines.append("• pH: 6.0-7.5 | Organic matter: >1% | EC: <1 dS/m")
        lines.append("• N: 280-560 kg/ha | P: 22-44 kg/ha | K: 280-560 kg/ha")
    return "\n".join(lines)


def generate_organic_response(context, question):
    crop = context.get("crop", "Your Crop")
    lines = [f"🌿 **Organic Farming Advisory — {crop}**\n"]
    lines.append("**Organic certification:** Takes 3 years (conversion period). Apply through APEDA or state organic board.\n")
    lines.append("**Key organic inputs:**")
    lines.append("• **Vermicompost:** 2-3 t/ha — improves soil structure and microbial activity")
    lines.append("• **FYM (Farm Yard Manure):** 10-15 t/ha — apply 3-4 weeks before sowing")
    lines.append("• **Neem cake:** 200 kg/ha — pest repellent + slow-release nitrogen")
    lines.append("• **Trichoderma:** 2.5 kg/ha — controls soil-borne diseases")
    lines.append("• **Pseudomonas:** 2.5 kg/ha — controls bacterial diseases")
    lines.append("• **Rhizobium/Azotobacter:** seed inoculation — fixes atmospheric nitrogen")
    lines.append("\n**Organic pest control:**")
    lines.append("• Neem oil 5ml/L — broad-spectrum insecticide/fungicide")
    lines.append("• Jeevamrit (fermented cow dung solution) — weekly spray")
    lines.append("• Panchagavya 3% — growth promoter + pest repellent")
    lines.append("• Sticky traps, pheromone traps for monitoring")
    lines.append("\n💡 Organic produce fetches 20-40% premium in market. Register on eNAM for better prices.")
    return "\n".join(lines)


def generate_ipm_response(context, question):
    crop = context.get("crop", "Your Crop")
    lines = [f"🔬 **Integrated Pest Management (IPM) — {crop}**\n"]
    lines.append(GENERAL_AGRI_KB["ipm"])
    lines.append("\n**IPM Pyramid (use in order):**")
    lines.append("1. **Cultural control:** Crop rotation, resistant varieties, proper spacing, field sanitation")
    lines.append("2. **Mechanical control:** Hand picking, sticky traps, pheromone traps, light traps")
    lines.append("3. **Biological control:** Trichogramma (egg parasitoid), NPV virus, Chrysoperla, Beauveria")
    lines.append("4. **Chemical control:** Only when pest crosses Economic Threshold Level (ETL)")
    lines.append("\n**Economic Threshold Levels (ETL):**")
    lines.append("• Aphids: 10-15 per leaf | Whitefly: 6-8 per leaf | Bollworm: 5% damaged bolls")
    lines.append("• Stem borer: 5% dead hearts | BPH (rice): 5-10 per hill")
    lines.append("\n💡 IPM reduces pesticide cost by 40% and improves produce quality for export markets.")
    return "\n".join(lines)


def generate_storage_response(context, question):
    crop = context.get("crop", "Your Crop")
    crop_key = context.get("crop_key", "")
    lines = [f"🏪 **Post-Harvest & Storage Advisory — {crop}**\n"]
    lines.append(GENERAL_AGRI_KB["post_harvest"])
    lines.append("\n**Cold storage temperatures:**")
    lines.append(GENERAL_AGRI_KB["cold_storage"])
    storage_tips = {
        "potato": "Store at 2-4°C, 90-95% RH. Avoid light exposure (causes greening/solanine). Cure at 15-20°C for 2 weeks before cold storage.",
        "onion": "Store at 0-2°C, 65-70% RH. Cure in field for 7-10 days. Remove damaged bulbs. Good ventilation essential.",
        "tomato": "Store at 10-13°C. Never refrigerate below 10°C — causes chilling injury. Ethylene-sensitive — store away from apples/bananas.",
        "wheat": "Store at <14% moisture, 10-15°C. Use hermetic bags or metal bins. Treat with Aluminium phosphide (3g/tonne) for long storage.",
        "rice": "Store at <14% moisture. Hermetic storage prevents weevil damage. Check every 2 weeks for moisture and pests.",
    }
    if crop_key in storage_tips:
        lines.append(f"\n**{crop} specific storage:**")
        lines.append(storage_tips[crop_key])
    lines.append("\n**Warehouse management:**")
    lines.append("• Clean and fumigate warehouse before storing new produce")
    lines.append("• Stack bags on pallets — never directly on floor")
    lines.append("• Maintain proper ventilation to prevent moisture buildup")
    lines.append("• Register on eNAM for warehouse receipt financing")
    return "\n".join(lines)


def generate_cropping_system_response(context, question):
    crop = context.get("crop", "Your Crop")
    lines = [f"🔄 **Cropping System Advisory — {crop}**\n"]
    lines.append(GENERAL_AGRI_KB["crop_rotation"])
    lines.append("\n**Recommended rotations:**")
    lines.append("• Rice → Wheat → Maize (North India)")
    lines.append("• Cotton → Wheat → Groundnut (Central India)")
    lines.append("• Tomato → Onion → Maize (Vegetable belt)")
    lines.append("• Sugarcane → Wheat → Maize (UP/Bihar)")
    lines.append("\n**Intercropping benefits:**")
    lines.append(GENERAL_AGRI_KB["intercropping"])
    lines.append("\n**Popular intercropping systems:**")
    lines.append("• Maize + Soybean (1:2 rows) — 30% more income")
    lines.append("• Cotton + Groundnut (1:4 rows) — groundnut fixes nitrogen")
    lines.append("• Sugarcane + Onion — onion harvested before sugarcane shades out")
    lines.append("• Mango + Turmeric — turmeric grows in shade, doubles income")
    return "\n".join(lines)


def generate_profit_response(context, question):
    crop = context.get("crop", "Your Crop")
    farm_size = context.get("farm_size", 2)
    lines = [f"💰 **Profitability Advisory — {crop}**\n"]
    lines.append(f"**For a {farm_size}-acre {crop} farm — track these costs:**")
    lines.append("• Seeds/planting material | Fertilizers | Pesticides")
    lines.append("• Labor (sowing, weeding, harvesting) | Irrigation | Equipment rental")
    lines.append("• Transport | Packaging | Market fees (2-5% of sale value)")
    lines.append("\n**Profit optimization strategies:**")
    lines.append("• Drip irrigation — saves 30% water cost")
    lines.append("• IPM — reduces pesticide cost by 40%")
    lines.append("• Grade produce — Grade A fetches 15-20% premium")
    lines.append("• Direct marketing — bypass middlemen for 10-25% more")
    lines.append("• Intercropping — 20-40% additional income from same land")
    lines.append("• Value addition (processing, packaging) — 2-3x price increase")
    lines.append("\n💡 Use the Expense Tracker in AgroVision to monitor all costs and calculate net profit per acre.")
    return "\n".join(lines)


def generate_scheme_response(context, question):
    state = context.get("state", "")
    lines = ["🏛️ **Government Schemes for Farmers**\n"]
    lines.append("**1. PM-KISAN** — ₹6,000/year (₹2,000 × 3 installments)")
    lines.append("   Check status: https://pmkisan.gov.in → Beneficiary Status\n")
    lines.append("**2. PMFBY** (Crop Insurance) — Premium: 2% Kharif, 1.5% Rabi, 5% Horticulture")
    lines.append("   Apply via bank/CSC before sowing season deadline\n")
    lines.append("**3. KCC** (Kisan Credit Card) — Up to ₹3 lakh @ 4% interest")
    lines.append("   Apply at any nationalized bank with land documents\n")
    lines.append("**4. Soil Health Card** — Free soil testing every 2 years")
    lines.append("   Register: https://soilhealth.dac.gov.in\n")
    lines.append("**5. PMKSY** (Drip/Sprinkler Irrigation) — 55-75% subsidy for small farmers")
    lines.append("   Apply at District Agriculture Office\n")
    lines.append("**6. eNAM** (National Agriculture Market) — Online mandi, better prices")
    lines.append("   Register: https://enam.gov.in\n")
    lines.append("**7. FPO Scheme** — ₹15 lakh equity grant for Farmer Producer Organizations")
    if state:
        lines.append(f"\n📍 Check {state}-specific schemes at your District Agriculture Office or state agriculture portal.")
    lines.append("\n💡 Visit the Government Schemes page in AgroVision for eligibility check and application links.")
    return "\n".join(lines)


def generate_general_response(context, question):
    crop = context.get("crop", "your crop")
    city = context.get("city", "your area")
    stage = context.get("growth_stage", {})
    q_lower = question.lower()
    lines = [f"🌿 **FarmGPT Advisory**\n"]
    if stage.get("stage") and stage["stage"] != "Unknown":
        lines.append(f"📍 **{crop}** — {stage['stage']} stage (Day {stage.get('day','?')})")
        lines.append(f"💡 Current care: {stage.get('care','Continue regular monitoring.')}\n")
    if any(w in q_lower for w in ["micronutrient","zinc","boron","iron","manganese"]):
        lines.append(GENERAL_AGRI_KB["micronutrients"])
    elif any(w in q_lower for w in ["bio fertilizer","biofertilizer","rhizobium","azotobacter","psb"]):
        lines.append(GENERAL_AGRI_KB["bio_fertilizers"])
    elif any(w in q_lower for w in ["seed treatment","treat seed"]):
        lines.append(GENERAL_AGRI_KB["seed_treatment"])
    elif any(w in q_lower for w in ["drip","sprinkler","micro irrigation"]):
        lines.append(GENERAL_AGRI_KB["drip_irrigation"])
    else:
        lines.append(f"I understand your question: *\"{question}\"*")
        lines.append(f"Based on your farm profile ({crop} in {city}), here are some recommendations:\n")
        lines.append("• Monitor your field daily for early signs of pests or disease")
        lines.append("• Follow your crop calendar for timely fertilizer and irrigation")
        lines.append("• Check the Weather page for spray-safe windows")
        lines.append("• Use the Marketplace to compare prices before selling")
        lines.append("\nYou can ask me specifically about:")
        lines.append("🐛 Pest/disease | 💧 Irrigation | 🧪 Fertilizer | 🌤️ Weather | 📈 Market | 🌾 Harvest | 🌱 Sowing | 🏔️ Soil | 🏛️ Schemes")
    lines.append("\n⚠️ *Advisory only — verify with your local agronomist for critical decisions.*")
    return "\n".join(lines)


# ── Main orchestrator ────────────────────────────────────────────────────────

def process_question(question, context_json):
    context = json.loads(context_json) if isinstance(context_json, str) else context_json
    crop_raw = (context.get("crop", "") or "").strip().lower()
    # Normalize crop aliases
    aliases = {
        "paddy": "rice", "dhan": "rice", "gehun": "wheat", "makka": "maize",
        "corn": "maize", "narma": "cotton", "bt cotton": "cotton",
        "arhar": "soybean", "moong": "soybean", "groundnut": "groundnut",
        "peanut": "groundnut", "aloo": "potato", "pyaz": "onion",
        "mirch": "chilli", "pepper": "chilli", "ganna": "sugarcane",
        "kela": "banana", "aam": "mango",
    }
    crop_key = aliases.get(crop_raw, crop_raw if crop_raw in CROP_KB else "")
    context["crop_key"] = crop_key
    if not context.get("crop"):
        context["crop"] = crop_raw.title() or "Your Crop"
    if context.get("weather"):
        context["weather_insights"] = interpret_weather(context["weather"])
    context["growth_stage"] = get_growth_stage(crop_key, context.get("sowingDate"))
    intent = detect_intent(question)
    response_map = {
        "greeting":             lambda: generate_greeting(context),
        "pest_management":      lambda: generate_pest_response(context, question),
        "disease_management":   lambda: generate_disease_response(context, question),
        "irrigation":           lambda: generate_irrigation_response(context, question),
        "fertilizer":           lambda: generate_fertilizer_response(context, question),
        "weather_advice":       lambda: generate_weather_response(context, question),
        "market_advice":        lambda: generate_market_response(context, question),
        "harvest_advice":       lambda: generate_harvest_response(context, question),
        "sowing_advice":        lambda: generate_sowing_response(context, question),
        "soil_advice":          lambda: generate_soil_response(context, question),
        "profit_advice":        lambda: generate_profit_response(context, question),
        "scheme_advice":        lambda: generate_scheme_response(context, question),
        "organic_advice":       lambda: generate_organic_response(context, question),
        "ipm_advice":           lambda: generate_ipm_response(context, question),
        "storage_advice":       lambda: generate_storage_response(context, question),
        "cropping_system_advice": lambda: generate_cropping_system_response(context, question),
        "general":              lambda: generate_general_response(context, question),
    }
    answer = response_map.get(intent, response_map["general"])()
    return json.dumps({
        "success": True,
        "intent": intent,
        "response": answer,
        "context_used": {
            "crop": context.get("crop"),
            "stage": context.get("growth_stage", {}).get("stage"),
            "weather_risk": context.get("weather_insights", {}).get("risk_level"),
            "day_in_crop": context.get("growth_stage", {}).get("day"),
        },
        "disclaimer": "Advisory only — verify with your local agronomist for critical decisions."
    })


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: farmgpt_engine.py <question> <context_json>"}))
        sys.exit(1)
    try:
        print(process_question(sys.argv[1], sys.argv[2]))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
