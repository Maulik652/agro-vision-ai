import React from "react";
import { Funnel, RefreshCcw, Search } from "lucide-react";

const SearchBar = ({
  search,
  onSearchChange,
  cropFilter,
  onCropChange,
  locationFilter,
  onLocationChange,
  sort,
  onSortChange,
  onReset,
  cropOptions = ["All", "Tomato", "Onion", "Rice", "Wheat", "Cotton"]
}) => {
  return (
    <section className="rounded-3xl border border-[#d7edd8] bg-white/90 shadow-[0_12px_35px_-24px_rgba(24,88,38,0.58)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a7f52]" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search crops, mandi city, farmer name"
            className="w-full rounded-xl border border-[#cfe7d1] bg-[#f8fff8] py-3 pl-10 pr-4 text-sm text-[#16321b] outline-none ring-offset-2 transition focus:border-[#4caf50] focus:ring-2 focus:ring-[#4caf50]/25"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-155">
          <label className="col-span-1 flex items-center gap-2 rounded-xl border border-[#d5ead6] bg-[#fbfffb] px-3 py-2 text-xs text-[#35643d]">
            <Funnel size={14} />
            <select
              value={cropFilter}
              onChange={(event) => onCropChange(event.target.value)}
              className="w-full bg-transparent text-sm text-[#133118] outline-none"
            >
              {cropOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <input
            value={locationFilter}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="City"
            className="col-span-1 rounded-xl border border-[#d5ead6] bg-[#fbfffb] px-3 py-2 text-sm text-[#133118] outline-none focus:border-[#4caf50]"
          />

          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            className="col-span-1 rounded-xl border border-[#d5ead6] bg-[#fbfffb] px-3 py-2 text-sm text-[#133118] outline-none focus:border-[#4caf50]"
          >
            <option value="latest">Latest</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="quantity_high">Quantity</option>
            <option value="trending">Trending</option>
          </select>

          <button
            type="button"
            onClick={onReset}
            className="col-span-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#e6f5e7] px-3 py-2 text-sm font-semibold text-[#245c2f] transition hover:bg-[#d8eedb]"
          >
            <RefreshCcw size={14} />
            Reset
          </button>
        </div>
      </div>
    </section>
  );
};

export default SearchBar;
