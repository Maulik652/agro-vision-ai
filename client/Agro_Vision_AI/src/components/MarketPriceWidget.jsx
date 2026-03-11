import React from "react";
import { ArrowUpRight, CircleGauge, Flame, TrendingUp } from "lucide-react";

const formatCurrency = (value) => `Rs ${new Intl.NumberFormat("en-IN").format(Math.round(Number(value || 0)))}`;

const MarketPriceWidget = ({ highDemandCrops = [], demandInsight }) => {
  const topRows = highDemandCrops.slice(0, 4);

  return (
    <section className="grid gap-4 rounded-3xl border border-[#d7edd8] bg-white p-4 shadow-[0_16px_36px_-30px_rgba(30,96,42,0.72)] sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-2xl bg-linear-to-br from-[#2e7d32] to-[#4caf50] p-4 text-white xl:col-span-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
          <Flame size={14} />
          High Demand Pulse
        </p>

        <h3 className="mt-3 text-xl font-extrabold">Live Mandi Intelligence</h3>
        <p className="mt-1 text-sm text-white/90">
          AI continuously blends buyer velocity, active listings, and regional trend activity.
        </p>

        {demandInsight ? (
          <div className="mt-4 rounded-xl bg-white/15 p-3">
            <p className="text-sm font-semibold">{demandInsight.crop || "Market"} demand is {demandInsight.demand_level || "MEDIUM"}</p>
            <p className="mt-1 text-xs text-white/85">
              Expected price: {formatCurrency(demandInsight.expected_price)} /kg
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#f9f6c0]">
              <CircleGauge size={12} />
              Confidence {demandInsight.confidence || "--"}%
            </p>
          </div>
        ) : null}
      </div>

      {topRows.length ? (
        topRows.map((item) => (
          <article
            key={`${item.cropName}-${item.samples}`}
            className="rounded-2xl border border-[#deefd9] bg-[#f9fff9] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#68856e]">{item.cropName}</p>
            <p className="mt-2 text-2xl font-extrabold text-[#1f5028]">{formatCurrency(item.avgPrice)}</p>
            <p className="mt-1 text-xs text-[#53745a]">Avg market price per kg</p>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f5e9] px-2 py-1 font-semibold text-[#2f7a42]">
                <TrendingUp size={13} />
                {Math.round(item.demandScore)}
              </span>
              <span className="inline-flex items-center gap-1 text-[#3f7249]">
                <ArrowUpRight size={14} />
                {Math.round(item.volume)} kg
              </span>
            </div>
          </article>
        ))
      ) : (
        <div className="xl:col-span-3 rounded-2xl border border-dashed border-[#cbe2ce] bg-[#f7fff8] p-5 text-sm text-[#4f7557]">
          Demand cards will appear after the first marketplace listings and trend sync.
        </div>
      )}
    </section>
  );
};

export default MarketPriceWidget;
