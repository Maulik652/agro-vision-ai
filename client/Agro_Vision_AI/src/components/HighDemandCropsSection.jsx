import React from "react";
import { Flame, TrendingUp } from "lucide-react";

const demandLabel = (score) => {
  const safe = Number(score || 0);

  if (safe >= 74) {
    return "Very High";
  }

  if (safe >= 55) {
    return "High";
  }

  return "Medium";
};

const HighDemandCropsSection = ({ crops = [] }) => {
  const rows = crops.slice(0, 3);

  return (
    <section className="rounded-3xl border border-[#d8ebda] bg-white p-5 shadow-[0_18px_38px_-28px_rgba(28,95,40,0.68)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-2xl font-black text-[#1f4f2a]">
          <Flame size={20} />
          High Demand Today
        </h2>
        <span className="rounded-full bg-[#e7f5e9] px-3 py-1 text-xs font-semibold text-[#2c6f3c]">
          Buyer Demand Pulse
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {rows.length ? rows.map((crop) => (
          <article
            key={`${crop.cropName}-${crop.samples || 0}`}
            className="rounded-2xl border border-[#d8ecd9] bg-[linear-gradient(160deg,#ffffff,#f4fbf5)] p-4 transition hover:-translate-y-1 hover:shadow-md"
          >
            <p className="text-lg font-extrabold text-[#205328]">{crop.cropName}</p>
            <p className="mt-1 text-sm text-[#5a7860]">Demand: {demandLabel(crop.demandScore)}</p>
            <p className="mt-2 text-xl font-black text-[#2a6b39]">Rs {Math.round(Number(crop.avgPrice || 0))}/kg</p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#3d7349]">
              <TrendingUp size={14} />
              Demand score {Math.round(Number(crop.demandScore || 0))}
            </p>
          </article>
        )) : (
          <div className="sm:col-span-3 rounded-2xl border border-dashed border-[#cde2cf] bg-[#f8fff8] p-4 text-sm text-[#5c7b63]">
            Demand cards will appear after listing activity sync.
          </div>
        )}
      </div>
    </section>
  );
};

export default HighDemandCropsSection;
