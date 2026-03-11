import React, { useEffect, useState } from "react";
import { CalendarDays, MapPin, Phone, ShieldCheck, Warehouse } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import CropCard from "../../components/CropCard";
import TrendChart from "../../components/TrendChart";
import { getCropDetail } from "../../api/marketplaceApi";

const formatCurrency = (value) => `Rs ${new Intl.NumberFormat("en-IN").format(Number(value || 0))}`;
const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const CropDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listing, setListing] = useState(null);
  const [related, setRelated] = useState([]);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getCropDetail(id);
        if (!active) {
          return;
        }

        setListing(response.listing || null);
        setRelated(response.related || []);
        setTrend(response.trend || []);
      } catch (apiError) {
        if (!active) {
          return;
        }
        setError(apiError?.response?.data?.message || "Unable to load crop details.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fff8] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-4">
          <div className="h-12 rounded-2xl bg-white" />
          <div className="h-80 rounded-3xl bg-white" />
          <div className="h-52 rounded-3xl bg-white" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-[#f8fff8] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          {error || "Crop listing not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5fff5,#fbfff9)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="grid gap-5 rounded-3xl border border-[#d7edd8] bg-white p-5 shadow-[0_18px_32px_-26px_rgba(28,90,40,0.65)] lg:grid-cols-[1.05fr,0.95fr]">
          <div className="overflow-hidden rounded-2xl border border-[#d5ead7] bg-[#f6fff7]">
            {listing.image ? (
              <img src={listing.image} alt={listing.cropName} className="h-full min-h-80 w-full object-cover" />
            ) : (
              <div className="grid min-h-80 place-items-center bg-linear-to-br from-[#2d7b31] via-[#5db95f] to-[#f9a825] text-xl font-black text-white">
                {listing.cropName}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-[#e8f6ea] px-3 py-1 text-xs font-semibold text-[#2c6e3d]">
                <ShieldCheck size={14} />
                AI Verified Listing
              </p>
              <h1 className="mt-3 text-3xl font-black text-[#1f4f2a]">{listing.cropName}</h1>
              <p className="mt-1 text-sm text-[#55745c]">{listing.qualityType === "organic" ? "Organic produce" : "Normal produce"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <article className="rounded-xl bg-[#f4fbf5] p-3">
                <p className="text-xs text-[#618269]">Price</p>
                <p className="text-xl font-extrabold text-[#215629]">{formatCurrency(listing.price)}</p>
              </article>
              <article className="rounded-xl bg-[#fff8e8] p-3">
                <p className="text-xs text-[#89711f]">AI Suggestion</p>
                <p className="text-xl font-extrabold text-[#6f5a13]">{listing.aiSuggestedPrice ? formatCurrency(listing.aiSuggestedPrice) : "Pending"}</p>
              </article>
              <article className="rounded-xl bg-[#f4fbf5] p-3">
                <p className="text-xs text-[#618269]">Available Quantity</p>
                <p className="text-xl font-extrabold text-[#215629]">{listing.quantity} {listing.quantityUnit}</p>
              </article>
              <article className="rounded-xl bg-[#f4fbf5] p-3">
                <p className="text-xs text-[#618269]">Farmer Rating</p>
                <p className="text-xl font-extrabold text-[#215629]">{Number(listing.farmer?.rating || 4.6).toFixed(1)}</p>
              </article>
            </div>

            <div className="space-y-2 text-sm text-[#496b51]">
              <p className="inline-flex items-center gap-2"><MapPin size={15} /> {listing.location?.city}, {listing.location?.state}</p>
              <p className="inline-flex items-center gap-2"><CalendarDays size={15} /> Harvest date: {formatDate(listing.harvestDate)}</p>
              <p className="inline-flex items-center gap-2"><Warehouse size={15} /> Listed by: {listing.farmer?.name}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={listing.farmer?.phone ? `tel:${listing.farmer.phone}` : "#"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2e7d32] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#235f28]"
              >
                <Phone size={15} />
                Contact Buyer/Farmer
              </a>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl border border-[#c8e1cb] bg-[#f6fff7] px-4 py-2.5 text-sm font-semibold text-[#2b6e3c] transition hover:bg-[#e8f5e9]"
              >
                Back
              </button>
            </div>
          </div>
        </section>

        <TrendChart trends={trend} title={`${listing.cropName} Market Trend`} />

        <section className="space-y-3 rounded-3xl border border-[#d7edd8] bg-white p-4 shadow-[0_16px_30px_-25px_rgba(29,90,40,0.64)]">
          <h3 className="text-xl font-black text-[#1f4f2a]">Related Listings</h3>
          {related.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {related.map((item) => (
                <CropCard key={item.id} listing={item} onView={(nextId) => navigate(`/marketplace/crop/${nextId}`)} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#58775f]">No related listings available at the moment.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default CropDetail;
