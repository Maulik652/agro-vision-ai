import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
  getAIDemandPrediction,
  getFarmerEarningsDashboard,
  getHighDemandCrops,
  getMarketplaceListings,
  getMarketTrends,
  getNearbyBuyers,
  getSmartBuyerAlerts
} from "../../api/marketplaceApi";
import BuyerAlertsPanel from "../../components/BuyerAlertsPanel";
import BuyerMap from "../../components/BuyerMap";
import CropCard from "../../components/CropCard";
import FarmerEarningsDashboard from "../../components/FarmerEarningsDashboard";
import FarmerTrustPanel from "../../components/FarmerTrustPanel";
import HeroSmartMarket from "../../components/HeroSmartMarket";
import HighDemandCropsSection from "../../components/HighDemandCropsSection";
import LogisticsSupportCard from "../../components/LogisticsSupportCard";
import PriceSuggestion from "../../components/PriceSuggestion";
import QualityScanCard from "../../components/QualityScanCard";
import QuickSellStepsCard from "../../components/QuickSellStepsCard";
import SearchBar from "../../components/SearchBar";
import TrendChart from "../../components/TrendChart";

const fade = {
  hidden: { opacity: 0, y: 18 },
  visible: (index = 1) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: index * 0.06, ease: "easeOut" }
  })
};

const MarketplaceHub = ({ mode = "farmer" }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [cropFilter, setCropFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState(user?.city || "Surat");
  const [sort, setSort] = useState("latest");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [listings, setListings] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [trends, setTrends] = useState([]);
  const [highDemandCrops, setHighDemandCrops] = useState([]);
  const [demandInsight, setDemandInsight] = useState(null);
  const [aiToolOutput, setAiToolOutput] = useState(null);
  const [buyerAlerts, setBuyerAlerts] = useState([]);
  const [earnings, setEarnings] = useState(null);

  const cropOptions = useMemo(() => {
    const dynamic = Array.from(new Set(listings.map((item) => item.cropName).filter(Boolean)));
    return ["All", ...dynamic];
  }, [listings]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const cropForApi = cropFilter === "All" ? "" : cropFilter;
        const demandCrop = cropFilter === "All" ? "Tomato" : cropFilter;

        const [
          marketRes,
          buyersRes,
          trendRes,
          demandRes,
          highDemandRes,
          alertsRes,
          earningsRes
        ] = await Promise.all([
          getMarketplaceListings({
            search,
            crop: cropForApi,
            location: locationFilter,
            sort,
            limit: 12
          }),
          getNearbyBuyers({ location: locationFilter, crop: cropForApi, limit: 8 }),
          getMarketTrends({ crop: demandCrop, location: locationFilter, days: 7 }),
          getAIDemandPrediction({ crop: demandCrop, location: locationFilter }),
          getHighDemandCrops(),
          getSmartBuyerAlerts({ crop: demandCrop, location: locationFilter, quantity: 500 }),
          mode === "farmer" ? getFarmerEarningsDashboard() : Promise.resolve(null)
        ]);

        if (!active) {
          return;
        }

        setListings(marketRes?.listings || []);
        setBuyers(buyersRes?.buyers || []);
        setTrends(trendRes?.trends || []);
        setDemandInsight({ crop: demandCrop, ...demandRes });
        setHighDemandCrops(highDemandRes?.crops || []);
        setBuyerAlerts(alertsRes?.alerts || []);
        setEarnings(earningsRes);
      } catch (apiError) {
        if (!active) {
          return;
        }

        setError(apiError?.response?.data?.message || "Unable to load marketplace data.");
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
  }, [search, cropFilter, locationFilter, sort, mode]);

  const resetFilters = () => {
    setSearch("");
    setCropFilter("All");
    setLocationFilter(user?.city || "Surat");
    setSort("latest");
  };

  const livePriceRows = highDemandCrops.slice(0, 3).map((item) => ({
    cropName: item.cropName,
    avgPrice: item.avgPrice,
    demandScore: item.demandScore
  }));

  const handleOffer = (row) => {
    const cropName = row?.cropName || row?.businessName || "this listing";
    toast.success(`Offer draft opened for ${cropName}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_4%_2%,#e8f6e8_0,transparent_34%),radial-gradient(circle_at_95%_0,#fff4cf_0,transparent_26%),linear-gradient(180deg,#f5fff5_0%,#fbfffa_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <motion.div variants={fade} initial="hidden" animate="visible" custom={1}>
          <HeroSmartMarket
            search={search}
            onSearchChange={setSearch}
            locationLabel={locationFilter || user?.city || "Surat"}
            livePriceRows={livePriceRows}
            onQuickSell={() => navigate(mode === "farmer" ? "/farmer/sell-crop" : "/buyer/marketplace")}
          />
        </motion.div>

        <motion.div variants={fade} initial="hidden" animate="visible" custom={2}>
          <HighDemandCropsSection crops={highDemandCrops} />
        </motion.div>

        <motion.div variants={fade} initial="hidden" animate="visible" custom={3}>
          <SearchBar
            search={search}
            onSearchChange={setSearch}
            cropFilter={cropFilter}
            onCropChange={setCropFilter}
            locationFilter={locationFilter}
            onLocationChange={setLocationFilter}
            sort={sort}
            onSortChange={setSort}
            onReset={resetFilters}
            cropOptions={cropOptions}
          />
        </motion.div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        ) : null}

        <motion.section variants={fade} initial="hidden" animate="visible" custom={4} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#1f4f2a]">Modern Marketplace Grid</h2>
            <p className="text-sm text-[#52725a]">{loading ? "Loading..." : `${listings.length} listings live`}</p>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-3xl border border-[#d8ecd9] bg-white" />
              ))}
            </div>
          ) : listings.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <CropCard
                  key={listing.id}
                  listing={listing}
                  onView={(id) => navigate(`/marketplace/crop/${id}`)}
                  onOffer={handleOffer}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#c9dfcc] bg-white px-4 py-8 text-center text-[#58755f]">
              No listings found for your search filters. Try another crop or location.
            </div>
          )}
        </motion.section>

        <motion.div variants={fade} initial="hidden" animate="visible" custom={5} className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <BuyerMap
            buyers={buyers}
            locationLabel={locationFilter || user?.city || "Market"}
            onSendOffer={handleOffer}
          />
          <BuyerAlertsPanel alerts={buyerAlerts} />
        </motion.div>

        <motion.div variants={fade} initial="hidden" animate="visible" custom={6}>
          <PriceSuggestion
            defaultCrop={cropFilter === "All" ? "Tomato" : cropFilter}
            defaultLocation={locationFilter || user?.city || "Surat"}
            onSuggestion={setAiToolOutput}
          />
        </motion.div>

        {aiToolOutput ? (
          <motion.div
            variants={fade}
            initial="hidden"
            animate="visible"
            custom={7}
            className="rounded-2xl border border-[#d4e9d7] bg-white p-4 text-sm text-[#406849]"
          >
            AI Insight: demand is <span className="font-bold">{aiToolOutput?.demand_prediction?.demand_level || aiToolOutput?.demand_level}</span> and expected price is near <span className="font-bold">Rs {aiToolOutput?.demand_prediction?.expected_price || aiToolOutput?.suggested_price}</span> per kg.
          </motion.div>
        ) : null}

        <motion.div variants={fade} initial="hidden" animate="visible" custom={8}>
          <TrendChart trends={trends} title="Tomato Price Trend (7 Days)" />
        </motion.div>

        <motion.div variants={fade} initial="hidden" animate="visible" custom={9} className="grid gap-4 lg:grid-cols-3">
          <QualityScanCard />
          <LogisticsSupportCard defaultPickup="Farm" defaultDrop={`${locationFilter || "Surat"} Market`} />
          <section className="rounded-3xl border border-[#d8ebda] bg-white p-5 shadow-[0_16px_30px_-24px_rgba(24,88,38,0.62)]">
            <h3 className="inline-flex items-center gap-2 text-lg font-black text-[#1f4f2a]">
              <CreditCard size={18} />
              Instant Payment
            </h3>
            <p className="mt-2 text-sm text-[#58745f]">
              Enable direct settlement after deal confirmation.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-[#e7f5e9] px-3 py-1 text-[#2a6f3c]">UPI</span>
              <span className="rounded-full bg-[#e7f5e9] px-3 py-1 text-[#2a6f3c]">Bank Transfer</span>
              <span className="rounded-full bg-[#e7f5e9] px-3 py-1 text-[#2a6f3c]">Wallet</span>
            </div>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#cde2cf] bg-[#f8fff8] px-4 py-2 text-sm font-semibold text-[#2f7040]"
            >
              <Store size={15} />
              Activate Fast Payout
            </button>
          </section>
        </motion.div>

        {mode === "farmer" ? (
          <motion.div variants={fade} initial="hidden" animate="visible" custom={10}>
            <QuickSellStepsCard onSellNow={() => navigate("/farmer/sell-crop")} />
          </motion.div>
        ) : null}

        <motion.div variants={fade} initial="hidden" animate="visible" custom={11} className="grid gap-4 lg:grid-cols-2">
          <FarmerTrustPanel listings={listings} />
          {mode === "farmer" ? <FarmerEarningsDashboard data={earnings} /> : <BuyerAlertsPanel alerts={buyerAlerts} />}
        </motion.div>

        <motion.div variants={fade} initial="hidden" animate="visible" custom={12} className="rounded-2xl border border-[#d6ead8] bg-[#f8fff8] p-4 text-sm text-[#3f6848]">
          Voice tip: Click the mic in the hero search and say "show tomato buyers near me".
        </motion.div>
      </div>
    </div>
  );
};

export default MarketplaceHub;
