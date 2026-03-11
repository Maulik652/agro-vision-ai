import React, { useMemo, useState } from "react";
import { Mic, MicOff, Search, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

const demandDirection = (value) => {
  const safe = Number(value || 0);

  if (safe >= 58) {
    return "up";
  }

  return "down";
};

const HeroSmartMarket = ({
  search,
  onSearchChange,
  locationLabel = "Surat",
  livePriceRows = [],
  onQuickSell
}) => {
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const resolvedRows = useMemo(() => {
    if (livePriceRows.length) {
      return livePriceRows.slice(0, 3).map((row) => ({
        cropName: row.cropName,
        avgPrice: Number(row.avgPrice || row.pricePerKg || 0),
        direction: row.direction || demandDirection(row.demandScore)
      }));
    }

    return [
      { cropName: "Tomato", avgPrice: 20, direction: "up" },
      { cropName: "Wheat", avgPrice: 28, direction: "down" },
      { cropName: "Cotton", avgPrice: 65, direction: "up" }
    ];
  }, [livePriceRows]);

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError("Voice search is not supported on this browser.");
      return;
    }

    setVoiceError("");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onerror = () => {
      setListening(false);
      setVoiceError("Unable to capture voice input. Please try again.");
    };
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || "";
      onSearchChange?.(text);
    };

    recognition.start();
  };

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-[#cde5cf] bg-[linear-gradient(135deg,#2e7d32,#4caf50_42%,#6ec86f)] p-6 text-white shadow-[0_30px_60px_-36px_rgba(25,90,36,0.85)] sm:p-8">
      <div className="absolute -right-12.5 -top-7.5 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-17.5 -left-5 h-48 w-48 rounded-full bg-[#f9a825]/25 blur-2xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1.15fr,0.85fr] lg:items-end">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
            <Sparkles size={14} />
            Smart Digital Mandi
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
            Smart Digital Mandi
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">
            Find the best buyers, get live mandi pricing, and sell your crop faster with AI-powered decisions.
          </p>

          <div className="mt-5 flex items-center gap-2 rounded-full border border-white/25 bg-white/95 p-2 shadow-xl">
            <div className="relative flex-1">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2d6b39]" />
              <input
                value={search}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder="Search crops, buyers, mandi"
                className="w-full rounded-full bg-transparent py-3 pl-11 pr-4 text-sm font-medium text-[#1c3d24] outline-none placeholder:text-[#5a7e63]"
              />
            </div>
            <button
              type="button"
              onClick={startVoiceSearch}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f7ea] text-[#1f6d32] transition hover:bg-[#d5efd8]"
              title="Voice search"
            >
              {listening ? <MicOff size={17} /> : <Mic size={17} />}
            </button>
          </div>

          {voiceError ? <p className="mt-2 text-xs text-[#ffe3a8]">{voiceError}</p> : null}

          <button
            type="button"
            onClick={onQuickSell}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#f9a825] px-5 py-3 text-sm font-bold text-[#2f2304] transition hover:-translate-y-0.5 hover:bg-[#fbb938]"
          >
            Sell My Crop
          </button>
        </div>

        <div className="rounded-3xl border border-white/25 bg-white/12 p-4 backdrop-blur-sm">
          <p className="text-sm font-bold">{locationLabel} Market Prices Today</p>
          <div className="mt-3 space-y-2">
            {resolvedRows.map((row) => (
              <div
                key={row.cropName}
                className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-3 py-2"
              >
                <span className="text-sm font-semibold">{row.cropName}</span>
                <span className="inline-flex items-center gap-1 text-sm font-bold">
                  Rs {Math.round(row.avgPrice)}/kg
                  {row.direction === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSmartMarket;
