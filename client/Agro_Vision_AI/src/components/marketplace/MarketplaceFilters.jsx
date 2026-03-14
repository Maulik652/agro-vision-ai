import { FilterX } from "lucide-react";
import LocationFilter from "./LocationFilter";

const MarketplaceFilters = ({ filters, onChange, onReset, categoryOptions, locationOptions }) => (
  <section className="rounded-3xl border border-[#d7ebda] bg-white p-4 shadow-[0_14px_30px_-22px_rgba(20,78,37,0.42)]">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-lg font-extrabold text-[#174a26]">Advanced Filters</h2>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1 rounded-lg border border-[#cfe2d3] bg-[#f8fff9] px-3 py-1.5 text-xs font-semibold text-[#2d6f3e] transition hover:bg-[#e9f7ec]"
      >
        <FilterX size={13} />
        Reset
      </button>
    </div>

    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <select
        value={filters.category}
        onChange={(event) => onChange?.("category", event.target.value)}
        className="rounded-xl border border-[#cee0d2] bg-white px-3 py-2 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
      >
        {categoryOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <LocationFilter
        value={filters.location}
        onChange={(value) => onChange?.("location", value)}
        options={locationOptions}
      />

      <input
        type="number"
        min="0"
        value={filters.minPrice}
        onChange={(event) => onChange?.("minPrice", event.target.value)}
        placeholder="Min price"
        className="rounded-xl border border-[#cee0d2] bg-white px-3 py-2 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
      />

      <input
        type="number"
        min="0"
        value={filters.maxPrice}
        onChange={(event) => onChange?.("maxPrice", event.target.value)}
        placeholder="Max price"
        className="rounded-xl border border-[#cee0d2] bg-white px-3 py-2 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
      />

      <select
        value={filters.organic}
        onChange={(event) => onChange?.("organic", event.target.value)}
        className="rounded-xl border border-[#cee0d2] bg-white px-3 py-2 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
      >
        <option value="all">All Certification Types</option>
        <option value="true">Organic Certified</option>
        <option value="false">Non Organic</option>
      </select>

      <input
        type="date"
        value={filters.harvestFrom}
        onChange={(event) => onChange?.("harvestFrom", event.target.value)}
        className="rounded-xl border border-[#cee0d2] bg-white px-3 py-2 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
      />

      <input
        type="date"
        value={filters.harvestTo}
        onChange={(event) => onChange?.("harvestTo", event.target.value)}
        className="rounded-xl border border-[#cee0d2] bg-white px-3 py-2 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
      />

      <input
        type="number"
        min="0"
        max="5"
        step="0.1"
        value={filters.minRating}
        onChange={(event) => onChange?.("minRating", event.target.value)}
        placeholder="Minimum farmer rating"
        className="rounded-xl border border-[#cee0d2] bg-white px-3 py-2 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
      />

      <input
        type="number"
        min="0"
        step="1"
        value={filters.minQuantity}
        onChange={(event) => onChange?.("minQuantity", event.target.value)}
        placeholder="Minimum quantity (kg)"
        className="rounded-xl border border-[#cee0d2] bg-white px-3 py-2 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
      />
    </div>
  </section>
);

export default MarketplaceFilters;
