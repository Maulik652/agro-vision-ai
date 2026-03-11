import React, { useState } from "react";
import { LoaderCircle, ScanSearch } from "lucide-react";
import { getAIQualityCheck } from "../api/marketplaceApi";

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const QualityScanCard = () => {
  const [crop, setCrop] = useState("Tomato");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const runScan = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const imageBase64 = await fileToBase64(file);
      const response = await getAIQualityCheck({ crop, imageBase64 });
      setResult(response);
    } catch (apiError) {
      setError(apiError?.response?.data?.message || "Unable to run quality scan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#d7ebd9] bg-white p-4 shadow-[0_16px_30px_-24px_rgba(25,89,40,0.62)]">
      <h3 className="inline-flex items-center gap-2 text-lg font-black text-[#1f4f2a]">
        <ScanSearch size={18} />
        AI Crop Quality Scan
      </h3>

      <div className="mt-3 flex gap-2">
        <input
          value={crop}
          onChange={(event) => setCrop(event.target.value)}
          placeholder="Crop"
          className="flex-1 rounded-xl border border-[#d2e6d4] bg-[#fafffa] px-3 py-2 text-sm outline-none"
        />
        <label className="inline-flex cursor-pointer items-center rounded-xl bg-[#2e7d32] px-3 py-2 text-sm font-semibold text-white">
          Upload
          <input type="file" accept="image/*" className="hidden" onChange={runScan} />
        </label>
      </div>

      {loading ? (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-[#2b6d3c]">
          <LoaderCircle size={14} className="animate-spin" />
          Analyzing image quality...
        </p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {result ? (
        <div className="mt-3 rounded-2xl border border-[#d6ead8] bg-[#f7fff8] p-3 text-sm text-[#285f36]">
          <p className="font-bold">{result.quality_grade}</p>
          <p className="mt-1 text-xs">Freshness: {result.freshness_score}%</p>
          <p className="mt-1 text-xs">Disease risk: {result.disease_risk}%</p>
          <p className="mt-1 text-xs">{result.recommendation}</p>
        </div>
      ) : null}
    </section>
  );
};

export default QualityScanCard;
