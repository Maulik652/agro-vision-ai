import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Sparkles,
  Target,
  UploadCloud,
  WandSparkles
} from "lucide-react";
import {
  createCropListing,
  getAIPriceSuggestion,
  getAIQualityCheck,
  getAISellAssistant
} from "../api/marketplaceApi";

const deliveryOptionCatalog = [
  { key: "farm-pickup", label: "Farm Pickup" },
  { key: "mandi-drop", label: "Mandi Drop" },
  { key: "warehouse-delivery", label: "Warehouse Delivery" }
];

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const parseLocation = (value, fallbackState = "Gujarat") => {
  const parts = String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    city: parts[0] || "",
    state: parts[1] || fallbackState
  };
};

const parseCsv = (value, maxItems = 8) => {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04
    }
  }
};

const panelReveal = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

const SellCropForm = ({ defaultLocation = "Surat, Gujarat", onCreated }) => {
  const [form, setForm] = useState({
    cropName: "",
    variety: "",
    quantity: "",
    quantityUnit: "kg",
    price: "",
    locationText: defaultLocation,
    harvestDate: "",
    grade: "B",
    qualityType: "normal",
    moisturePercent: "12",
    shelfLifeDays: "7",
    packagingType: "standard-bag",
    minOrderQty: "50",
    negotiable: true,
    responseSlaHours: "12",
    deliveryOptions: ["farm-pickup"],
    certificationsText: "",
    tagsText: ""
  });

  const [imageBase64, setImageBase64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [aiPrice, setAiPrice] = useState(null);
  const [qualityResult, setQualityResult] = useState(null);
  const [sellAssistant, setSellAssistant] = useState(null);

  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [loadingAssistant, setLoadingAssistant] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const readinessScore = useMemo(() => {
    const checks = [
      Boolean(form.cropName.trim()),
      Boolean(form.variety.trim()),
      Number(form.quantity) > 0,
      Boolean(form.locationText.trim()),
      Boolean(form.harvestDate),
      Boolean(imageBase64),
      Boolean(aiPrice),
      Boolean(sellAssistant),
      Boolean(qualityResult)
    ];

    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [form.cropName, form.harvestDate, form.locationText, form.quantity, form.variety, aiPrice, imageBase64, qualityResult, sellAssistant]);

  const canRunAI = useMemo(() => {
    return Boolean(form.cropName.trim() && Number(form.quantity) > 0 && form.locationText.trim());
  }, [form.cropName, form.locationText, form.quantity]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDeliveryOption = (option) => {
    setForm((prev) => {
      const exists = prev.deliveryOptions.includes(option);
      const next = exists
        ? prev.deliveryOptions.filter((item) => item !== option)
        : [...prev.deliveryOptions, option];

      return {
        ...prev,
        deliveryOptions: next.length ? next : ["farm-pickup"]
      };
    });
  };

  const runPriceSuggestion = async () => {
    if (!canRunAI) {
      setError("Enter crop, quantity, and location before using AI.");
      return;
    }

    setLoadingPrice(true);
    setError("");

    try {
      const response = await getAIPriceSuggestion({
        crop: form.cropName,
        quantity: Number(form.quantity),
        location: parseLocation(form.locationText).city,
        demand: sellAssistant?.demand_level || "MEDIUM"
      });

      setAiPrice(response);

      if (!form.price && Number(response.suggested_price) > 0) {
        updateField("price", String(response.suggested_price));
      }
    } catch (apiError) {
      setError(apiError?.response?.data?.message || "Unable to get AI price suggestion.");
    } finally {
      setLoadingPrice(false);
    }
  };

  const runSellAssistant = async () => {
    if (!canRunAI) {
      setError("Enter crop, quantity, and location before running Sell Assistant.");
      return;
    }

    setLoadingAssistant(true);
    setError("");

    try {
      const response = await getAISellAssistant({
        crop: form.cropName,
        quantity: Number(form.quantity),
        location: parseLocation(form.locationText).city,
        qualityType: form.qualityType,
        grade: form.grade,
        shelfLifeDays: Number(form.shelfLifeDays),
        moisturePercent: Number(form.moisturePercent),
        packagingType: form.packagingType,
        demand: aiPrice?.demand_level || "MEDIUM"
      });

      setSellAssistant(response);

      const idealPrice = Number(response?.recommended_price_band?.ideal);
      if (!form.price && Number.isFinite(idealPrice) && idealPrice > 0) {
        updateField("price", String(idealPrice));
      }
    } catch (apiError) {
      setError(apiError?.response?.data?.message || "Unable to run AI sell assistant.");
    } finally {
      setLoadingAssistant(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setLoadingQuality(true);
    setError("");
    setMessage("");

    try {
      const base64 = await fileToBase64(file);
      setImageBase64(base64);
      setImagePreview(base64);

      const quality = await getAIQualityCheck({
        crop: form.cropName || "crop",
        imageBase64: base64,
        location: parseLocation(form.locationText).city
      });

      setQualityResult(quality);
    } catch (apiError) {
      setError(apiError?.response?.data?.message || "Unable to run image quality check.");
    } finally {
      setLoadingQuality(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const location = parseLocation(form.locationText);

      if (!location.city || !location.state) {
        throw new Error("Location must be in City, State format.");
      }

      const quantity = Number(form.quantity);
      const price = Number(form.price);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("Quantity must be greater than 0.");
      }

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Price must be greater than 0.");
      }

      const payload = {
        cropName: form.cropName,
        variety: form.variety,
        quantity,
        quantityUnit: form.quantityUnit,
        price,
        location,
        image: imageBase64,
        qualityType: form.qualityType,
        grade: form.grade,
        moisturePercent: clamp(Number(form.moisturePercent) || 0, 0, 100),
        shelfLifeDays: clamp(Number(form.shelfLifeDays) || 7, 1, 45),
        packagingType: form.packagingType,
        minOrderQty: Math.max(1, Number(form.minOrderQty) || 1),
        negotiable: Boolean(form.negotiable),
        responseSlaHours: clamp(Number(form.responseSlaHours) || 12, 1, 72),
        deliveryOptions: form.deliveryOptions,
        certifications: parseCsv(form.certificationsText, 8),
        tags: parseCsv(form.tagsText, 8),
        harvestDate: form.harvestDate,
        demand: sellAssistant?.demand_level || aiPrice?.demand_level || "MEDIUM"
      };

      const response = await createCropListing(payload);
      setMessage("Listing published successfully. Buyers can now discover your crop.");
      onCreated?.(response);

      setForm((prev) => ({
        ...prev,
        cropName: "",
        variety: "",
        quantity: "",
        price: "",
        harvestDate: "",
        certificationsText: "",
        tagsText: ""
      }));

      setImageBase64("");
      setImagePreview("");
      setAiPrice(null);
      setQualityResult(null);
      setSellAssistant(null);
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError.message || "Unable to publish listing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.section
      className="rounded-3xl border border-[#d1e6d4] bg-white p-5 shadow-[0_28px_44px_-32px_rgba(24,88,40,0.6)]"
      variants={formStagger}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={panelReveal} className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[#1f4d2f]">AI Guided Sell Crop Form</h2>
          <p className="mt-1 text-sm text-[#5c7766]">Fill once, optimize with AI, and publish with confidence.</p>
        </div>
        <div className="rounded-xl border border-[#d6ead9] bg-[#f7fff8] px-3 py-2 text-sm font-semibold text-[#2a6a3f]">
          Publish Readiness: {readinessScore}%
        </div>
      </motion.div>

      <motion.div variants={panelReveal} className="mb-5 h-2 rounded-full bg-[#e3f0e5]">
        <motion.div
          className="h-2 rounded-full bg-[linear-gradient(90deg,#2f7a47,#de8f36)]"
          initial={{ width: "8%" }}
          animate={{ width: `${Math.max(8, readinessScore)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </motion.div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="rounded-2xl border border-[#d4e8d7] bg-[#f9fff9] p-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#517062]">1. Crop Basics</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={form.cropName}
              onChange={(event) => updateField("cropName", event.target.value)}
              placeholder="Crop Name"
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
              required
            />
            <input
              value={form.variety}
              onChange={(event) => updateField("variety", event.target.value)}
              placeholder="Variety (e.g., Hybrid 814)"
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
              required
            />
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(event) => updateField("quantity", event.target.value)}
              placeholder="Quantity"
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
              required
            />
            <select
              value={form.quantityUnit}
              onChange={(event) => updateField("quantityUnit", event.target.value)}
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
            >
              <option value="kg">kg</option>
              <option value="quintal">quintal</option>
              <option value="ton">ton</option>
            </select>

            <input
              value={form.locationText}
              onChange={(event) => updateField("locationText", event.target.value)}
              placeholder="Location (City, State)"
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64] lg:col-span-2"
              required
            />
            <input
              type="date"
              value={form.harvestDate}
              onChange={(event) => updateField("harvestDate", event.target.value)}
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
              required
            />
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={(event) => updateField("price", event.target.value)}
              placeholder="Price per unit"
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
              required
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#d4e8d7] bg-[#f9fff9] p-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#517062]">2. Quality and Post-Harvest</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={form.grade}
              onChange={(event) => updateField("grade", event.target.value)}
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
            >
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </select>
            <select
              value={form.qualityType}
              onChange={(event) => updateField("qualityType", event.target.value)}
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
            >
              <option value="normal">Normal</option>
              <option value="organic">Organic</option>
            </select>
            <input
              type="number"
              min="0"
              max="100"
              value={form.moisturePercent}
              onChange={(event) => updateField("moisturePercent", event.target.value)}
              placeholder="Moisture %"
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
            />
            <input
              type="number"
              min="1"
              max="45"
              value={form.shelfLifeDays}
              onChange={(event) => updateField("shelfLifeDays", event.target.value)}
              placeholder="Shelf life days"
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
            />

            <select
              value={form.packagingType}
              onChange={(event) => updateField("packagingType", event.target.value)}
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
            >
              <option value="standard-bag">Standard Bag</option>
              <option value="jute-bag">Jute Bag</option>
              <option value="crate">Crate</option>
              <option value="cold-box">Cold Box</option>
            </select>
            <input
              type="number"
              min="1"
              value={form.minOrderQty}
              onChange={(event) => updateField("minOrderQty", event.target.value)}
              placeholder="Min order quantity"
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
            />
            <input
              type="number"
              min="1"
              max="72"
              value={form.responseSlaHours}
              onChange={(event) => updateField("responseSlaHours", event.target.value)}
              placeholder="Response SLA (hours)"
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64]"
            />
            <label className="inline-flex items-center gap-2 rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm text-[#355d45]">
              <input
                type="checkbox"
                checked={form.negotiable}
                onChange={(event) => updateField("negotiable", event.target.checked)}
              />
              Negotiable price
            </label>

            <input
              value={form.certificationsText}
              onChange={(event) => updateField("certificationsText", event.target.value)}
              placeholder="Certifications (comma separated)"
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64] sm:col-span-2"
            />
            <input
              value={form.tagsText}
              onChange={(event) => updateField("tagsText", event.target.value)}
              placeholder="Tags (comma separated)"
              className="rounded-xl border border-[#cfe4d2] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4c9a64] sm:col-span-2"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {deliveryOptionCatalog.map((option) => {
              const active = form.deliveryOptions.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleDeliveryOption(option.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-[#2f7a47] bg-[#e8f6eb] text-[#2f7243]" : "border-[#d1e5d4] bg-white text-[#57715f]"}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#d4e8d7] bg-[#f9fff9] p-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#517062]">3. AI Assist</h3>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runPriceSuggestion}
              disabled={!canRunAI || loadingPrice}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2f7a47] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-65"
            >
              {loadingPrice ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
              AI Price Suggestion
            </button>

            <button
              type="button"
              onClick={runSellAssistant}
              disabled={!canRunAI || loadingAssistant}
              className="inline-flex items-center gap-2 rounded-xl bg-[#dc8c36] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-65"
            >
              {loadingAssistant ? <LoaderCircle size={15} className="animate-spin" /> : <WandSparkles size={15} />}
              AI Sell Assistant
            </button>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#cfe4d2] bg-white px-4 py-2 text-sm font-semibold text-[#2f6b41]">
              <UploadCloud size={15} />
              Upload Crop Image
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>

          {imagePreview ? (
            <img src={imagePreview} alt="Crop preview" className="mt-3 h-40 w-full rounded-xl object-cover sm:w-80" />
          ) : null}

          {loadingQuality ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#d8eadb] bg-white px-3 py-2 text-sm text-[#3e6349]">
              <LoaderCircle size={15} className="animate-spin" />
              Running quality check...
            </p>
          ) : null}

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {aiPrice ? (
              <article className="rounded-xl border border-[#d4e8d7] bg-white p-3 text-sm text-[#2f6941]">
                <p className="font-bold">AI Price</p>
                <p className="mt-1">Suggested: <span className="font-black">Rs {aiPrice.suggested_price}/kg</span></p>
                <p className="text-xs text-[#5f7a68]">Confidence {aiPrice.confidence}% | Demand {aiPrice.demand_level}</p>
              </article>
            ) : null}

            {qualityResult ? (
              <article className="rounded-xl border border-[#d4e8d7] bg-white p-3 text-sm text-[#2f6941]">
                <p className="font-bold">AI Quality Scan</p>
                <p className="mt-1">{qualityResult.quality_grade} | Freshness {qualityResult.freshness_score}%</p>
                <p className="text-xs text-[#5f7a68]">Disease risk {qualityResult.disease_risk}%</p>
              </article>
            ) : null}

            {sellAssistant ? (
              <article className="rounded-xl border border-[#f0ddc4] bg-[#fff8ef] p-3 text-sm text-[#6b512f] lg:col-span-2">
                <p className="font-bold">Sell Assistant</p>
                <p className="mt-1">Readiness {sellAssistant.readiness_score}/100 | Match Rate {sellAssistant.expected_buyer_match_rate}%</p>
                <p className="mt-1 text-xs">Price Band: Rs {sellAssistant?.recommended_price_band?.min} - Rs {sellAssistant?.recommended_price_band?.max} (ideal Rs {sellAssistant?.recommended_price_band?.ideal})</p>
                {(sellAssistant.recommendations || []).slice(0, 2).map((tip) => (
                  <p key={tip} className="mt-1 text-xs">- {tip}</p>
                ))}
              </article>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertTriangle size={15} />
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 size={15} />
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d6ead9] bg-[#f7fff8] p-4">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-[#2c6640]"><Target size={15} /> Final Publish Gate</p>
            <p className="mt-1 text-xs text-[#5f7b6a]">Aim for 75%+ readiness before publishing for better buyer conversion.</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1f5b34] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Publish Listing
          </button>
        </div>
      </form>
    </motion.section>
  );
};

export default SellCropForm;

