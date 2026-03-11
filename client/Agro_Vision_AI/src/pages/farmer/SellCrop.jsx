import React from "react";
import { Lightbulb, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SellCropForm from "../../components/SellCropForm";

const SellCrop = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_4%,#e7f6e7_0,transparent_34%),radial-gradient(circle_at_95%_0,#fff2cd_0,transparent_26%),linear-gradient(180deg,#f5fff5,#fcfff9)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.05fr,0.95fr]">
        <section className="rounded-3xl border border-[#d3ead5] bg-white p-6 shadow-[0_18px_34px_-28px_rgba(22,87,36,0.63)]">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#e8f6ea] px-3 py-1 text-xs font-semibold text-[#2f7040]">
            <ShieldCheck size={14} />
            Verified marketplace publishing
          </p>
          <h1 className="mt-4 text-3xl font-black text-[#1f4f2a]">Sell Crop With AI Pricing</h1>
          <p className="mt-2 text-sm text-[#4d6f55]">
            Create your listing once and let AI optimize pricing, quality positioning, and buyer visibility.
          </p>

          <div className="mt-6 space-y-3">
            <article className="rounded-xl border border-[#d8ecd9] bg-[#f8fff8] p-4 text-sm text-[#3d6546]">
              <p className="font-bold text-[#295f37]">1. Accurate quantity and date</p>
              <p className="mt-1">Buyers trust listings that clearly mention quantity, unit, and harvest date.</p>
            </article>
            <article className="rounded-xl border border-[#d8ecd9] bg-[#f8fff8] p-4 text-sm text-[#3d6546]">
              <p className="font-bold text-[#295f37]">2. Better image means better rate</p>
              <p className="mt-1">Upload a sharp crop image so quality scoring can unlock premium demand segments.</p>
            </article>
            <article className="rounded-xl border border-[#d8ecd9] bg-[#f8fff8] p-4 text-sm text-[#3d6546]">
              <p className="font-bold text-[#295f37]">3. AI price first, then publish</p>
              <p className="mt-1">Use the suggested price to reduce negotiation churn and speed up buyer conversion.</p>
            </article>
          </div>

          <button
            type="button"
            onClick={() => navigate("/farmer/marketplace")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#c8e1cb] bg-[#f2fbf3] px-4 py-2.5 text-sm font-semibold text-[#2d6f3f] transition hover:bg-[#e7f6e9]"
          >
            <Lightbulb size={15} />
            Back to Marketplace
          </button>
        </section>

        <SellCropForm
          defaultLocation="Surat, Gujarat"
          onCreated={() => {
            navigate("/farmer/marketplace");
          }}
        />
      </div>
    </div>
  );
};

export default SellCrop;
