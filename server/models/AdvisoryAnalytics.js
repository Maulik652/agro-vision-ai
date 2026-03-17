import mongoose from "mongoose";

const advisoryAnalyticsSchema = new mongoose.Schema(
  {
    advisory:       { type: mongoose.Schema.Types.ObjectId, ref: "Advisory", required: true, index: true },
    views:          { type: Number, default: 0 },
    clicks:         { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    conversions:    { type: Number, default: 0 },
    reach:          { type: Number, default: 0 },
    /* Daily breakdown for charts */
    dailyStats: [
      {
        date:   { type: String },   // YYYY-MM-DD
        views:  { type: Number, default: 0 },
        clicks: { type: Number, default: 0 }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("AdvisoryAnalytics", advisoryAnalyticsSchema);
