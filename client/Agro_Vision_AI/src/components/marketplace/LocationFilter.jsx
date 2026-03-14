import { MapPin } from "lucide-react";

const LocationFilter = ({ value = "", onChange, options = [], placeholder = "All Locations" }) => (
  <label className="relative block">
    <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5e8367]" />
    <input
      type="text"
      list="marketplace-location-options"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#cee0d2] bg-white py-2 pl-9 pr-3 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
    />
    <datalist id="marketplace-location-options">
      {options.map((option) => (
        <option key={option} value={option} />
      ))}
    </datalist>
  </label>
);

export default LocationFilter;
