import React, { useState } from "react";
import { LoaderCircle, Truck } from "lucide-react";
import { getAILogisticsEstimate } from "../api/marketplaceApi";

const LogisticsSupportCard = ({ defaultPickup = "Farm", defaultDrop = "Surat Market" }) => {
  const [pickup, setPickup] = useState(defaultPickup);
  const [drop, setDrop] = useState(defaultDrop);
  const [vehicleType, setVehicleType] = useState("mini-truck");
  const [distanceKm, setDistanceKm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const estimate = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getAILogisticsEstimate({
        pickup,
        drop,
        vehicleType,
        distanceKm: distanceKm ? Number(distanceKm) : undefined
      });
      setResult(response);
    } catch (apiError) {
      setError(apiError?.response?.data?.message || "Unable to estimate logistics.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#d7ebd9] bg-white p-4 shadow-[0_16px_30px_-24px_rgba(25,89,40,0.62)]">
      <h3 className="inline-flex items-center gap-2 text-lg font-black text-[#1f4f2a]">
        <Truck size={18} />
        Need Transport?
      </h3>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={pickup}
          onChange={(event) => setPickup(event.target.value)}
          placeholder="Pickup"
          className="rounded-xl border border-[#d2e6d4] bg-[#fafffa] px-3 py-2 text-sm outline-none"
        />
        <input
          value={drop}
          onChange={(event) => setDrop(event.target.value)}
          placeholder="Drop"
          className="rounded-xl border border-[#d2e6d4] bg-[#fafffa] px-3 py-2 text-sm outline-none"
        />
        <select
          value={vehicleType}
          onChange={(event) => setVehicleType(event.target.value)}
          className="rounded-xl border border-[#d2e6d4] bg-[#fafffa] px-3 py-2 text-sm outline-none"
        >
          <option value="bike">Bike</option>
          <option value="auto">Auto</option>
          <option value="mini-truck">Mini Truck</option>
          <option value="truck">Truck</option>
        </select>
        <input
          value={distanceKm}
          onChange={(event) => setDistanceKm(event.target.value)}
          type="number"
          min="1"
          placeholder="Distance km (optional)"
          className="rounded-xl border border-[#d2e6d4] bg-[#fafffa] px-3 py-2 text-sm outline-none"
        />
      </div>

      <button
        type="button"
        onClick={estimate}
        disabled={loading}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#2e7d32] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
      >
        {loading ? <LoaderCircle size={14} className="animate-spin" /> : null}
        Estimate Cost
      </button>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {result ? (
        <div className="mt-3 rounded-2xl border border-[#d6ead8] bg-[#f7fff8] p-3 text-sm text-[#285f36]">
          <p className="font-bold">Estimated Cost: Rs {result.estimated_cost_inr}</p>
          <p className="mt-1 text-xs">Distance: {result.distance_km} km | ETA: {result.eta_hours} hrs</p>
          <p className="mt-1 text-xs">Vehicle: {result.recommended_vehicle}</p>
          <p className="mt-1 text-xs">Payment: {(result.payment_methods || []).join(", ") || "UPI, Bank Transfer, Wallet"}</p>
        </div>
      ) : null}
    </section>
  );
};

export default LogisticsSupportCard;
