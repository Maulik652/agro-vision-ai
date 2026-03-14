import { Activity, BarChart3, Brain, Sparkles, TrendingUp } from "lucide-react";

const formatCurrency = (value) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0))}`;

const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

const AIInsightsPanel = ({ category, data, source, isLoading, suggestedCrops = [] }) => {
  if (isLoading) {
    return <aside className="h-96 animate-pulse rounded-2xl bg-white" />;
  }

  return (
    <aside className="space-y-3 rounded-2xl border border-[#d8e9dc] bg-white p-4 shadow-[0_14px_30px_-24px_rgba(20,78,37,0.5)]">
      <div>
        <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-[#184a27]">
          <Brain size={18} className="text-purple-600" />
          AI Insights
        </h2>
        <p className="mt-1 text-xs text-[#5f8268]">Category: {category || "General"}</p>
        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#f0f4ff] px-2 py-0.5 text-[11px] font-semibold text-[#4b61ba]">
          <Sparkles size={11} />
          {source === "ai-service" ? "Live AI service" : "Fallback intelligence"}
        </p>
      </div>

      <div className="space-y-2">
        <article className="rounded-xl border border-[#dbeadf] bg-[#f9fefb] p-3">
          <p className="text-xs text-[#5f8268]">Predicted Market Price</p>
          <p className="text-lg font-extrabold text-[#1b4f29]">{formatCurrency(data?.predicted_price)}</p>
        </article>

        <article className="rounded-xl border border-[#dbeadf] bg-[#f9fefb] p-3">
          <p className="inline-flex items-center gap-1 text-xs text-[#5f8268]">
            <TrendingUp size={12} />
            Demand Trend
          </p>
          <p className="text-lg font-extrabold text-[#1b4f29]">{formatPercent(data?.demand_score)}</p>
        </article>

        <article className="rounded-xl border border-[#dbeadf] bg-[#f9fefb] p-3">
          <p className="inline-flex items-center gap-1 text-xs text-[#5f8268]">
            <Activity size={12} />
            Market Volatility
          </p>
          <p className="text-lg font-extrabold text-[#1b4f29]">{formatPercent(data?.volatility_index)}</p>
        </article>

        <article className="rounded-xl border border-[#dbeadf] bg-[#f9fefb] p-3">
          <p className="inline-flex items-center gap-1 text-xs text-[#5f8268]">
            <BarChart3 size={12} />
            Confidence Score
          </p>
          <p className="text-lg font-extrabold text-[#1b4f29]">{formatPercent(data?.confidence_score)}</p>
        </article>
      </div>

      <div>
        <h3 className="text-sm font-bold text-[#21592f]">Suggested Crops to Buy</h3>
        <ul className="mt-1 space-y-1">
          {(suggestedCrops.length ? suggestedCrops : []).slice(0, 5).map((crop) => (
            <li key={crop.cropName} className="rounded-lg bg-[#f5fbf7] px-2.5 py-1.5 text-xs font-semibold text-[#2f6e3e]">
              {crop.cropName} · {formatPercent(crop.demandScore)}
            </li>
          ))}
          {!suggestedCrops.length ? (
            <li className="rounded-lg bg-[#f5fbf7] px-2.5 py-1.5 text-xs font-semibold text-[#5f8268]">
              No suggestions available.
            </li>
          ) : null}
        </ul>
      </div>
    </aside>
  );
};

export default AIInsightsPanel;
