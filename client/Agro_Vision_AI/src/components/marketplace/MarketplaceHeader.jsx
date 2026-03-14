import { motion as Motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import LocationFilter from "./LocationFilter";

const SORT_OPTIONS = [
  { value: "price_low", label: "Price low to high" },
  { value: "price_high", label: "Price high to low" },
  { value: "newest_harvest", label: "Newest harvest" },
  { value: "highest_rating", label: "Highest rating" },
  { value: "ai_recommended", label: "AI recommended" }
];

const MarketplaceHeader = ({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  location,
  onLocationChange,
  sort,
  onSortChange,
  categoryOptions,
  locationOptions
}) => (
  <Motion.section
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-3xl border border-[#d7ebda] bg-white p-4 shadow-[0_14px_30px_-22px_rgba(20,78,37,0.42)]"
  >
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#184a27] sm:text-3xl">Marketplace</h1>
        <p className="text-sm text-[#5d7f64]">Discover crops, compare farmers, and buy with AI-backed insights.</p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-[#eef8f0] px-3 py-1 text-xs font-bold text-[#2f6f3f]">
        <SlidersHorizontal size={12} />
        Dynamic Live Filters
      </span>
    </div>

    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <label className="relative block">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5e8367]" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder="Search crop, farmer, category"
          className="w-full rounded-xl border border-[#cee0d2] bg-white py-2 pl-9 pr-3 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
        />
      </label>

      <select
        value={category}
        onChange={(event) => onCategoryChange?.(event.target.value)}
        className="w-full rounded-xl border border-[#cee0d2] bg-white px-3 py-2 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
      >
        {categoryOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <LocationFilter value={location} onChange={onLocationChange} options={locationOptions} />

      <select
        value={sort}
        onChange={(event) => onSortChange?.(event.target.value)}
        className="w-full rounded-xl border border-[#cee0d2] bg-white px-3 py-2 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </Motion.section>
);

export default MarketplaceHeader;
