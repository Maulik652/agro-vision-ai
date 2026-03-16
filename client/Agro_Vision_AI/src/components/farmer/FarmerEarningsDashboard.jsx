import React from "react";
import { BarChart3, Coins, ShoppingBasket } from "lucide-react";

const formatCurrency = (value) => `Rs ${new Intl.NumberFormat("en-IN").format(Math.round(Number(value || 0)))}`;

const FarmerEarningsDashboard = ({ data }) => {
  const analytics = data?.analytics || {};

  return (
    <section className="rounded-3xl border border-[#d7ebd9] bg-white p-5 shadow-[0_18px_32px_-24px_rgba(27,90,40,0.64)]">
      <h3 className="inline-flex items-center gap-2 text-xl font-black text-[#1f4f2a]">
        <BarChart3 size={20} />
        This Month
      </h3>
      <p className="mt-1 text-xs text-[#5d7b63]">Farmer Earnings Dashboard</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-[#d6ead8] bg-[#f7fff8] p-3">
          <p className="inline-flex items-center gap-1 text-xs font-semibold text-[#54755b]">
            <ShoppingBasket size={13} />
            Crops Sold
          </p>
          <p className="mt-2 text-2xl font-black text-[#205429]">{analytics.cropsSold || 0}</p>
        </article>

        <article className="rounded-2xl border border-[#d6ead8] bg-[#f7fff8] p-3">
          <p className="inline-flex items-center gap-1 text-xs font-semibold text-[#54755b]">
            <Coins size={13} />
            Revenue
          </p>
          <p className="mt-2 text-2xl font-black text-[#205429]">{formatCurrency(analytics.revenue)}</p>
        </article>

        <article className="rounded-2xl border border-[#d6ead8] bg-[#f7fff8] p-3">
          <p className="text-xs font-semibold text-[#54755b]">Top Crop</p>
          <p className="mt-2 text-2xl font-black text-[#205429]">{analytics.topCrop || "None"}</p>
        </article>
      </div>
    </section>
  );
};

export default FarmerEarningsDashboard;
