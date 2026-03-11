import React, { useMemo } from "react";
import { BadgeCheck, Leaf, Medal, ShieldCheck } from "lucide-react";

const FarmerTrustPanel = ({ listings = [] }) => {
  const topFarmers = useMemo(() => {
    const map = new Map();

    for (const listing of listings) {
      const farmer = listing.farmer || {};
      const key = farmer.id || farmer.name || listing.id;
      const current = map.get(key) || {
        id: key,
        name: farmer.name || "Farmer",
        rating: Number(farmer.rating || 4.6),
        verified: Boolean(farmer.verified),
        organicCount: 0,
        listings: 0
      };

      current.listings += 1;
      if (listing.qualityType === "organic") {
        current.organicCount += 1;
      }
      map.set(key, current);
    }

    return [...map.values()]
      .sort((left, right) => (right.rating + right.listings * 0.05) - (left.rating + left.listings * 0.05))
      .slice(0, 3);
  }, [listings]);

  return (
    <section className="rounded-3xl border border-[#d8ebda] bg-white p-5 shadow-[0_16px_30px_-24px_rgba(24,88,38,0.62)]">
      <h3 className="text-xl font-black text-[#1f4f2a]">Farmer Trust System</h3>
      <p className="mt-1 text-sm text-[#56745d]">Verified, high-rated, and consistent sellers are highlighted.</p>

      <div className="mt-4 space-y-3">
        {topFarmers.length ? topFarmers.map((farmer) => (
          <article key={farmer.id} className="rounded-2xl border border-[#d7ead8] bg-[#f8fff8] p-3">
            <p className="font-bold text-[#245e34]">{farmer.name}</p>
            <p className="mt-1 text-sm text-[#56755d]">Rating {farmer.rating.toFixed(1)}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e5f4e7] px-2 py-1 font-semibold text-[#2b6f3d]">
                <ShieldCheck size={12} />
                Verified Farmer
              </span>
              {farmer.organicCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#edf9ef] px-2 py-1 font-semibold text-[#2c6f3c]">
                  <Leaf size={12} />
                  Organic Producer
                </span>
              ) : null}
              {farmer.listings >= 2 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4d7] px-2 py-1 font-semibold text-[#7f6513]">
                  <Medal size={12} />
                  Top Seller
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eef7f0] px-2 py-1 font-semibold text-[#3f744a]">
                  <BadgeCheck size={12} />
                  Trusted
                </span>
              )}
            </div>
          </article>
        )) : (
          <div className="rounded-2xl border border-dashed border-[#cbe0cd] bg-[#f7fff8] p-4 text-sm text-[#5a7960]">
            Trust badges will populate after listing and buyer activity.
          </div>
        )}
      </div>
    </section>
  );
};

export default FarmerTrustPanel;
