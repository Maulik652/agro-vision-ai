import React, { useMemo, useState } from "react";
import { Bot, Sparkles, TrendingUp } from "lucide-react";
import { getAIDemandPrediction, getAIPriceSuggestion } from "../api/marketplaceApi";

const DEMAND_OPTIONS = ["HIGH", "MEDIUM", "LOW"];

const PriceSuggestion = ({ defaultCrop = "Tomato", defaultLocation = "Surat", onSuggestion }) => {
  const [crop, setCrop] = useState(defaultCrop);
  const [quantity, setQuantity] = useState(500);
  const [location, setLocation] = useState(defaultLocation);
  const [demand, setDemand] = useState("MEDIUM");
  const [last7, setLast7] = useState("21,22,23,22,24,23,22");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const parsedLast7Average = useMemo(() => {
    const values = String(last7)
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));

    if (!values.length) {
      return null;
    }

    return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2);
  }, [last7]);

  const handleRunAI = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = {
        crop,
        quantity: Number(quantity),
        location,
        demand,
        last_7_day_price: String(last7)
          .split(",")
          .map((item) => Number(item.trim()))
          .filter((item) => Number.isFinite(item))
      };

      const [price, demandPrediction] = await Promise.all([
        getAIPriceSuggestion(payload),
        getAIDemandPrediction({
          crop,
          location,
          last_7_day_price: payload.last_7_day_price
        })
      ]);

      const merged = {
        ...price,
        demand_prediction: demandPrediction
      };

      setResult(merged);
      onSuggestion?.(merged);
    } catch (apiError) {
      setError(apiError?.response?.data?.message || "Unable to fetch AI recommendation right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#d7edd8] bg-white p-4 shadow-[0_16px_34px_-28px_rgba(29,94,41,0.66)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-lg font-bold text-[#1f4f2a]">
          <Sparkles size={18} />
          AI Price Suggestion Tool
        </h3>
        <span className="rounded-full bg-[#e7f5e9] px-3 py-1 text-xs font-semibold text-[#2b6f3d]">
          Smart Mandi Engine
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          value={crop}
          onChange={(event) => setCrop(event.target.value)}
          placeholder="Crop"
          className="rounded-xl border border-[#d2e7d4] bg-[#fafffa] px-3 py-2 text-sm outline-none focus:border-[#4caf50]"
        />

        <input
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          type="number"
          min="1"
          placeholder="Quantity"
          className="rounded-xl border border-[#d2e7d4] bg-[#fafffa] px-3 py-2 text-sm outline-none focus:border-[#4caf50]"
        />

        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location"
          className="rounded-xl border border-[#d2e7d4] bg-[#fafffa] px-3 py-2 text-sm outline-none focus:border-[#4caf50]"
        />

        <select
          value={demand}
          onChange={(event) => setDemand(event.target.value)}
          className="rounded-xl border border-[#d2e7d4] bg-[#fafffa] px-3 py-2 text-sm outline-none focus:border-[#4caf50]"
        >
          {DEMAND_OPTIONS.map((option) => (
            <option key={option} value={option}>
              Demand {option}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleRunAI}
          disabled={loading}
          className="rounded-xl bg-[#2e7d32] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#236628] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Analyzing..." : "Run AI"}
        </button>
      </div>

      <div className="mt-3">
        <input
          value={last7}
          onChange={(event) => setLast7(event.target.value)}
          placeholder="Last 7 day prices (comma separated)"
          className="w-full rounded-xl border border-[#d2e7d4] bg-[#fafffa] px-3 py-2 text-sm outline-none focus:border-[#4caf50]"
        />
        <p className="mt-1 text-xs text-[#56765e]">Average trend price: {parsedLast7Average || "N/A"}</p>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      {result ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-[#d2e8d5] bg-[#f7fff8] p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#5a7e62]">Suggested Price</p>
            <p className="mt-1 text-2xl font-extrabold text-[#205529]">Rs {result.suggested_price}</p>
            <p className="text-xs text-[#4f7056]">per kg</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-[#5a7e62]">AI Confidence</p>
            <p className="mt-1 inline-flex items-center gap-1 text-2xl font-extrabold text-[#205529]">
              <Bot size={18} />
              {result.confidence}%
            </p>
            <p className="text-xs text-[#4f7056]">engine: {result.engine}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-[#5a7e62]">Demand Outlook</p>
            <p className="mt-1 inline-flex items-center gap-1 text-2xl font-extrabold text-[#205529]">
              <TrendingUp size={18} />
              {result.demand_prediction?.demand_level || result.demand_level}
            </p>
            <p className="text-xs text-[#4f7056]">Expected: Rs {result.demand_prediction?.expected_price || "--"}</p>
          </div>

          <div className="sm:col-span-3 rounded-xl border border-[#d6ead8] bg-white px-3 py-2 text-xs text-[#4f7056]">
            Based on: local demand, market trend, and buyer activity signals.
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default PriceSuggestion;
