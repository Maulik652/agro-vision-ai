import React from "react";
import { Building2, MapPinned, PhoneCall, Send } from "lucide-react";

const hashSeed = (value) => {
  const text = String(value || "buyer");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 100000;
  }

  return hash;
};

const pinPosition = (buyerId, axis) => {
  const seed = hashSeed(`${buyerId}-${axis}`);
  const min = axis === "x" ? 10 : 12;
  const max = axis === "x" ? 88 : 85;
  return min + (seed % (max - min));
};

const BuyerMap = ({ buyers = [], locationLabel = "Market Radius", onSendOffer }) => {
  const topBuyers = buyers.slice(0, 6);

  return (
    <section className="grid gap-4 rounded-3xl border border-[#d7edd8] bg-white p-4 shadow-[0_16px_32px_-28px_rgba(25,93,39,0.68)] lg:grid-cols-[1.1fr,0.9fr]">
      <div className="rounded-2xl border border-[#d8ecd9] bg-[#f8fff8] p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#2f7140]">
            <MapPinned size={16} />
            Nearby Buyers Map
          </p>
          <span className="rounded-full bg-[#e4f4e6] px-3 py-1 text-xs font-semibold text-[#2d6d3d]">
            {locationLabel}
          </span>
        </div>

        <div className="relative h-72 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_20%_15%,#d7f0d9,transparent_50%),radial-gradient(circle_at_80%_35%,#e9f9ea,transparent_52%),linear-gradient(180deg,#f9fff9_0%,#ecf8ed_100%)]">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#d8ebd9" strokeWidth="0.4" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />

            <circle cx="50" cy="50" r="16" fill="none" stroke="#8ac690" strokeWidth="0.9" strokeDasharray="2 1" />
            <circle cx="50" cy="50" r="28" fill="none" stroke="#8ac690" strokeWidth="0.7" strokeDasharray="2 1" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#8ac690" strokeWidth="0.5" strokeDasharray="2 1" />

            <circle cx="50" cy="50" r="2.5" fill="#2e7d32" />
          </svg>

          {topBuyers.map((buyer) => {
            const left = pinPosition(buyer.id, "x");
            const top = pinPosition(buyer.id, "y");

            return (
              <div
                key={buyer.id}
                className="group absolute"
                style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -50%)" }}
              >
                <div className="relative">
                  <span className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4caf50]/25 blur-sm" />
                  <span className="relative block h-3.5 w-3.5 rounded-full border-2 border-white bg-[#2e7d32] shadow" />
                </div>
                <div className="pointer-events-none absolute left-1/2 top-[120%] z-10 hidden w-40 -translate-x-1/2 rounded-lg border border-[#d6ead8] bg-white p-2 text-xs shadow-lg group-hover:block">
                  <p className="font-semibold text-[#2a6e3a]">{buyer.businessName}</p>
                  <p className="text-[#57765e]">{buyer.location?.city}</p>
                  <p className="text-[#3a6b46]">Rating {Number(buyer.rating || 0).toFixed(1)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-[#1d4e28]">Top Verified Buyers</h3>

        {topBuyers.length ? (
          topBuyers.map((buyer) => (
            <article
              key={`${buyer.id}-card`}
              className="rounded-xl border border-[#d5ead7] bg-[#fbfffb] p-3"
            >
              <p className="inline-flex items-center gap-2 text-sm font-bold text-[#2f6f3f]">
                <Building2 size={15} />
                {buyer.businessName}
              </p>
              <p className="mt-1 text-xs text-[#55735b]">{buyer.location?.city}, {buyer.location?.state}</p>
              <p className="mt-2 text-xs text-[#486d50]">Interested: {(buyer.cropsInterested || []).slice(0, 3).join(", ") || "All crops"}</p>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="rounded-full bg-[#e7f5e9] px-2 py-1 font-semibold text-[#2f7040]">
                  Rating {Number(buyer.rating || 0).toFixed(1)}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={buyer.phone ? `tel:${buyer.phone}` : "#"}
                    className="inline-flex items-center gap-1 text-[#2a6d3a] hover:text-[#1b5228]"
                  >
                    <PhoneCall size={13} />
                    Call Buyer
                  </a>
                  <button
                    type="button"
                    onClick={() => onSendOffer?.(buyer)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#cce2cf] bg-white px-2 py-1 font-semibold text-[#2e6f3f]"
                  >
                    <Send size={12} />
                    Send Offer
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[#cde2cf] bg-[#f7fff8] p-4 text-sm text-[#56775e]">
            Buyer network will populate after location search and profile sync.
          </div>
        )}
      </div>
    </section>
  );
};

export default BuyerMap;
