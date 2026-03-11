import mongoose from "mongoose";

const weatherForecastSchema = new mongoose.Schema(
  {
    dateISO: {
      type: String,
      required: true
    },
    day: {
      type: String,
      required: true
    },
    dayShort: {
      type: String,
      required: true
    },
    temperature: {
      type: Number,
      required: true
    },
    minTemp: {
      type: Number,
      required: true
    },
    maxTemp: {
      type: Number,
      required: true
    },
    humidity: {
      type: Number,
      required: true
    },
    windSpeed: {
      type: Number,
      required: true
    },
    rainProbability: {
      type: Number,
      required: true
    },
    cloudCoverage: {
      type: Number,
      required: true
    },
    condition: {
      type: String,
      required: true
    }
  },
  {
    _id: false
  }
);

const weatherAlertSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    detail: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true
    }
  },
  {
    _id: false
  }
);

const weatherAnalysisSchema = new mongoose.Schema(
  {
    summary: {
      type: String,
      default: ""
    },
    recommendations: {
      type: [String],
      default: []
    },
    alerts: {
      type: [weatherAlertSchema],
      default: []
    },
    riskScore: {
      type: Number,
      default: 0
    },
    irrigationHint: {
      type: String,
      default: ""
    },
    engine: {
      type: String,
      default: "rule-based"
    }
  },
  {
    _id: false
  }
);

const weatherDataSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    cropType: {
      type: String,
      default: ""
    },
    location: {
      name: {
        type: String,
        required: true
      },
      city: {
        type: String,
        default: ""
      },
      state: {
        type: String,
        default: ""
      },
      lat: {
        type: Number,
        default: null
      },
      lon: {
        type: Number,
        default: null
      },
      query: {
        type: String,
        default: ""
      },
      key: {
        type: String,
        required: true,
        index: true
      }
    },
    temperature: {
      type: Number,
      required: true
    },
    humidity: {
      type: Number,
      required: true
    },
    rainfall: {
      type: Number,
      required: true
    },
    windSpeed: {
      type: Number,
      required: true
    },
    rainProbability: {
      type: Number,
      required: true
    },
    cloudCoverage: {
      type: Number,
      required: true
    },
    uvIndex: {
      type: Number,
      required: true
    },
    condition: {
      type: String,
      required: true
    },
    forecast: {
      type: [weatherForecastSchema],
      default: []
    },
    analysis: {
      type: weatherAnalysisSchema,
      default: null
    },
    source: {
      type: String,
      enum: ["openweather", "fallback", "cache"],
      default: "fallback"
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

weatherDataSchema.index({ farmerId: 1, "location.key": 1, timestamp: -1 });

export default mongoose.models.WeatherData || mongoose.model("WeatherData", weatherDataSchema);
