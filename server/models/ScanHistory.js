import mongoose from "mongoose";

/**
 * ScanHistory
 * -----------
 * Stores individual crop scan results produced by the AI disease-detection
 * pipeline (POST /api/ai/crop-scan).  One document per scan attempt.
 */
const scanHistorySchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    cropType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    detectedDisease: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    /** Normalised 0.0 – 1.0 confidence returned by the model */
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },

    /** Disease severity 0 – 100 */
    severity: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    /** Overall plant health score 0 – 100 */
    healthScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    /** Top-3 prediction probabilities from the model */
    predictions: [
      {
        disease:    { type: String, trim: true, maxlength: 120 },
        confidence: { type: Number, min: 0, max: 1 },
        _id: false,
      },
    ],

    treatment:  [{ type: String, trim: true, maxlength: 500 }],
    prevention: [{ type: String, trim: true, maxlength: 500 }],

    /**
     * Optional URL to stored image.
     * null when the image was processed in-memory and not persisted.
     */
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 600,
      default: null,
    },

    /** Explicit scan date (defaults to document creation time) */
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* Compound index: fast per-farmer history queries sorted by date */
scanHistorySchema.index({ farmerId: 1, date: -1 });

const ScanHistory = mongoose.model("ScanHistory", scanHistorySchema);

export default ScanHistory;
