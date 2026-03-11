import React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const QuickSellStepsCard = ({ onSellNow }) => {
  return (
    <section className="rounded-3xl border border-[#d8ebda] bg-[linear-gradient(145deg,#ffffff,#f5fff6)] p-5 shadow-[0_16px_30px_-24px_rgba(26,92,39,0.65)]">
      <h3 className="text-xl font-black text-[#1f4f2a]">Quick Sell Crop Feature</h3>
      <p className="mt-1 text-sm text-[#56745d]">Farmers can publish in 3 simple steps.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <article className="rounded-2xl border border-[#d6ead8] bg-white p-3 text-sm text-[#2b6339]">
          <p className="inline-flex items-center gap-1 font-semibold"><CheckCircle2 size={14} /> Step 1</p>
          <p className="mt-1">Upload crop photo</p>
        </article>
        <article className="rounded-2xl border border-[#d6ead8] bg-white p-3 text-sm text-[#2b6339]">
          <p className="inline-flex items-center gap-1 font-semibold"><CheckCircle2 size={14} /> Step 2</p>
          <p className="mt-1">Enter quantity</p>
        </article>
        <article className="rounded-2xl border border-[#d6ead8] bg-white p-3 text-sm text-[#2b6339]">
          <p className="inline-flex items-center gap-1 font-semibold"><CheckCircle2 size={14} /> Step 3</p>
          <p className="mt-1">Set price and publish</p>
        </article>
      </div>

      <button
        type="button"
        onClick={onSellNow}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#2e7d32] px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#246329]"
      >
        Sell Crop Instantly
        <ArrowRight size={15} />
      </button>
    </section>
  );
};

export default QuickSellStepsCard;
