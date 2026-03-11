import React, { useMemo, useState } from "react";
import { LoaderCircle, Sparkles, UploadCloud } from "lucide-react";
import {
  createCropListing,
  getAIPriceSuggestion,
  getAIQualityCheck
} from "../api/marketplaceApi";

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

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const SellCropForm = ({ defaultLocation = "Surat, Gujarat", onCreated }) => {
  const [form, setForm] = useState({
    cropName: "",
    quantity: "",
    quantityUnit: "kg",
    price: "",
    locationText: defaultLocation,
    qualityType: "normal",
    harvestDate: ""
  });

  const [imageBase64, setImageBase64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [aiPrice, setAiPrice] = useState(null);
  const [qualityResult, setQualityResult] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canRequestAI = useMemo(() => {
    return Boolean(form.cropName.trim() && Number(form.quantity) > 0 && form.locationText.trim());
  }, [form.cropName, form.quantity, form.locationText]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const base64 = await fileToBase64(file);
    setImageBase64(base64);
    setImagePreview(base64);
    setQualityResult(null);
    setMessage("");

    if (!form.cropName.trim()) {
      return;
    }

    setLoadingQuality(true);
    try {
      const quality = await getAIQualityCheck({
        crop: form.cropName,
        imageBase64: base64,
        location: parseLocation(form.locationText).city
      });
      setQualityResult(quality);
    } catch (apiError) {
      setError(apiError?.response?.data?.message || "Unable to analyze crop quality from image.");
    } finally {
      setLoadingQuality(false);
    }
  };

  const runAISuggestion = async () => {
    if (!canRequestAI) {
      setError("Enter crop, quantity, and location first.");
      return;
    }

    setLoadingSuggestion(true);
    setError("");

    try {
      const response = await getAIPriceSuggestion({
        crop: form.cropName,
        quantity: Number(form.quantity),
        location: parseLocation(form.locationText).city,
        demand: "MEDIUM"
      });

      setAiPrice(response);
      if (!form.price) {
        updateField("price", String(response.suggested_price));
      }
    } catch (apiError) {
      setError(apiError?.response?.data?.message || "Unable to fetch AI price suggestion.");
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const location = parseLocation(form.locationText);
      if (!location.city) {
        throw new Error("Please provide location as City, State");
      }

      const payload = {
        cropName: form.cropName,
        quantity: Number(form.quantity),
        quantityUnit: form.quantityUnit,
        price: Number(form.price),
        location,
        image: imageBase64,
        qualityType: form.qualityType,
        harvestDate: form.harvestDate
      };

      const response = await createCropListing(payload);
      setMessage("Listing created successfully and published to marketplace.");

      onCreated?.(response);

      setForm((prev) => ({
        ...prev,
        cropName: "",
        quantity: "",
        price: "",
        harvestDate: ""
      }));
      setImageBase64("");
      setImagePreview("");
      setAiPrice(null);
      setQualityResult(null);
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError.message || "Unable to create listing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#d7edd8] bg-white p-5 shadow-[0_18px_36px_-28px_rgba(24,92,38,0.64)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-xl font-extrabold text-[#1f4e2a]">Sell Crop Listing</h3>
        <button
          type="button"
          onClick={runAISuggestion}
          disabled={!canRequestAI || loadingSuggestion}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2e7d32] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#256628] disabled:cursor-not-allowed disabled:opacity-65"
        >
          {loadingSuggestion ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
          AI Suggest Price
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={form.cropName}
            onChange={(event) => updateField("cropName", event.target.value)}
            placeholder="Crop Name"
            className="rounded-xl border border-[#d2e7d4] bg-[#fbfffb] px-3 py-2.5 text-sm outline-none focus:border-[#4caf50]"
            required
          />

          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={(event) => updateField("quantity", event.target.value)}
            placeholder="Quantity"
            className="rounded-xl border border-[#d2e7d4] bg-[#fbfffb] px-3 py-2.5 text-sm outline-none focus:border-[#4caf50]"
            required
          />

          <select
            value={form.quantityUnit}
            onChange={(event) => updateField("quantityUnit", event.target.value)}
            className="rounded-xl border border-[#d2e7d4] bg-[#fbfffb] px-3 py-2.5 text-sm outline-none focus:border-[#4caf50]"
          >
            <option value="kg">kg</option>
            <option value="quintal">quintal</option>
            <option value="ton">ton</option>
          </select>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(event) => updateField("price", event.target.value)}
            placeholder="Price per unit"
            className="rounded-xl border border-[#d2e7d4] bg-[#fbfffb] px-3 py-2.5 text-sm outline-none focus:border-[#4caf50]"
            required
          />

          <input
            value={form.locationText}
            onChange={(event) => updateField("locationText", event.target.value)}
            placeholder="Location (City, State)"
            className="rounded-xl border border-[#d2e7d4] bg-[#fbfffb] px-3 py-2.5 text-sm outline-none focus:border-[#4caf50]"
            required
          />

          <select
            value={form.qualityType}
            onChange={(event) => updateField("qualityType", event.target.value)}
            className="rounded-xl border border-[#d2e7d4] bg-[#fbfffb] px-3 py-2.5 text-sm outline-none focus:border-[#4caf50]"
          >
            <option value="normal">Normal</option>
            <option value="organic">Organic</option>
          </select>

          <input
            type="date"
            value={form.harvestDate}
            onChange={(event) => updateField("harvestDate", event.target.value)}
            className="rounded-xl border border-[#d2e7d4] bg-[#fbfffb] px-3 py-2.5 text-sm outline-none focus:border-[#4caf50] sm:col-span-2 lg:col-span-1"
            required
          />

          <label className="sm:col-span-2 lg:col-span-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#b8d7bd] bg-[#f8fff8] px-3 py-2.5 text-sm font-semibold text-[#2f7040] hover:bg-[#edf9ef]">
            <UploadCloud size={16} />
            Upload Crop Image
            <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </label>
        </div>

        {imagePreview ? (
          <img src={imagePreview} alt="Crop preview" className="h-44 w-full rounded-xl object-cover sm:w-80" />
        ) : null}

        {aiPrice ? (
          <div className="rounded-xl border border-[#d5ead7] bg-[#f6fff7] p-3 text-sm text-[#2f6f3f]">
            AI Suggested Price: <span className="font-extrabold">Rs {aiPrice.suggested_price}/kg</span>
            <span className="ml-2 text-xs text-[#5b7b62]">(Confidence {aiPrice.confidence}%)</span>
          </div>
        ) : null}

        {qualityResult ? (
          <div className="rounded-xl border border-[#d5ead7] bg-[#f6fff7] p-3 text-sm text-[#2f6f3f]">
            Quality Check: <span className="font-extrabold">{qualityResult.quality_grade}</span>
            <span className="ml-2 text-xs text-[#5b7b62]">Freshness {qualityResult.freshness_score}% | Disease Risk {qualityResult.disease_risk}%</span>
          </div>
        ) : loadingQuality ? (
          <div className="rounded-xl border border-[#d5ead7] bg-[#f6fff7] p-3 text-sm text-[#2f6f3f] inline-flex items-center gap-2">
            <LoaderCircle size={15} className="animate-spin" />
            Checking quality from image...
          </div>
        ) : null}

        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1f5729] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#184720] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? <LoaderCircle size={15} className="animate-spin" /> : null}
          Publish Listing
        </button>
      </form>
    </section>
  );
};

export default SellCropForm;
