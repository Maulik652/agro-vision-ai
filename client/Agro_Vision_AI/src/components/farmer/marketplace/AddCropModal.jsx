import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Upload, Loader2, CheckCircle, AlertCircle, Leaf, Package, MapPin, Calendar, Tag, Zap } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createCropListing, getAIPriceSuggestion } from "../../../api/marketplaceApi";
import { getAIPriceSuggestion as getAIPriceEnhanced } from "../../../api/farmerMarketplaceApi";

const CROPS = ["Wheat","Rice","Maize","Cotton","Soybean","Groundnut","Potato","Tomato","Onion","Sugarcane","Mango","Banana","Grapes","Sunflower","Mustard","Barley","Chickpea","Lentil","Turmeric","Ginger"];
const STATES = ["Andhra Pradesh","Bihar","Gujarat","Haryana","Karnataka","Madhya Pradesh","Maharashtra","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","West Bengal"];

const INIT = { cropName:"", variety:"", quantity:"", quantityUnit:"quintal", price:"", grade:"B", qualityType:"normal", moisturePercent:"", location:{ city:"", state:"" }, harvestDate:"", description:"", image:"" };

export default function AddCropModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(INIT);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const fileRef = useRef();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setLoc = (k, v) => setForm((p) => ({ ...p, location: { ...p.location, [k]: v } }));

  const { mutate: submit, isPending } = useMutation({
    mutationFn: createCropListing,
    onSuccess: () => { toast.success("Crop listed!"); onSuccess?.(); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to list crop"),
  });

  const handleAI = async () => {
    if (!form.cropName) return toast.error("Enter crop name first");
    setAiLoading(true);
    try {
      const res = await getAIPriceEnhanced({ crop: form.cropName, quantity: Number(form.quantity) || 100, location: form.location.city || "Ahmedabad", grade: form.grade, qualityType: form.qualityType });
      const s = res?.suggestion || res;
      setAiSuggestion(s);
      if (s?.suggestedPrice) set("price", String(s.suggestedPrice));
      toast.success("AI price applied!");
    } catch {
      toast.error("AI suggestion failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImgPreview(ev.target.result); set("image", ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.cropName || !form.quantity || !form.price || !form.location.city || !form.location.state) {
      return toast.error("Fill all required fields");
    }
    submit({ ...form, quantity: Number(form.quantity), price: Number(form.price), moisturePercent: Number(form.moisturePercent) || undefined, aiSuggestedPrice: aiSuggestion?.suggestedPrice || undefined, aiConfidence: aiSuggestion?.confidence || undefined });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }} className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20"><Leaf size={16} className="text-white" /></div>
            <div>
              <h2 className="text-base font-black text-white">List New Crop</h2>
              <p className="text-[10px] text-emerald-100/80">AI-powered pricing included</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Crop Name + Variety */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Crop Name *</label>
              <select value={form.cropName} onChange={(e) => set("cropName", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100">
                <option value="">Select crop</option>
                {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Variety</label>
              <input value={form.variety} onChange={(e) => set("variety", e.target.value)} placeholder="e.g. HD-2967, Basmati" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            </div>
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Quantity *</label>
              <input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="e.g. 500" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Unit</label>
              <select value={form.quantityUnit} onChange={(e) => set("quantityUnit", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100">
                <option value="kg">kg</option>
                <option value="quintal">Quintal</option>
                <option value="ton">Ton</option>
              </select>
            </div>
          </div>

          {/* Grade + Quality */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Quality Grade</label>
              <div className="flex gap-2">
                {["A","B","C"].map((g) => (
                  <button key={g} type="button" onClick={() => set("grade", g)} className={`flex-1 rounded-xl border py-2 text-sm font-bold transition ${form.grade === g ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300"}`}>Grade {g}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Quality Type</label>
              <div className="flex gap-2">
                {[["normal","Normal"],["organic","Organic 🌿"]].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => set("qualityType", v)} className={`flex-1 rounded-xl border py-2 text-xs font-bold transition ${form.qualityType === v ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300"}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Price + AI */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Price per {form.quantityUnit} (₹) *</label>
            <div className="flex gap-2">
              <input type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="Enter price or use AI" className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
              <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleAI} disabled={aiLoading} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:shadow-md transition disabled:opacity-60">
                {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                AI Price
              </motion.button>
            </div>
            <AnimatePresence>
              {aiSuggestion && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-xl border border-violet-200 bg-violet-50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={13} className="text-violet-600" />
                    <span className="text-xs font-bold text-violet-700">AI Suggestion Applied</span>
                    <span className="ml-auto text-[10px] text-violet-500">{aiSuggestion.confidence}% confidence</span>
                  </div>
                  <div className="flex gap-4 text-xs text-violet-700">
                    <span>Suggested: <strong>₹{aiSuggestion.suggestedPrice}</strong></span>
                    <span>Range: ₹{aiSuggestion.minPrice}–₹{aiSuggestion.maxPrice}</span>
                    <span className={`font-bold ${aiSuggestion.demandLevel === "High" ? "text-emerald-600" : aiSuggestion.demandLevel === "Medium" ? "text-amber-600" : "text-rose-600"}`}>{aiSuggestion.demandLevel} Demand</span>
                  </div>
                  <p className="mt-1 text-[10px] text-violet-600">{aiSuggestion.bestWindow}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">City *</label>
              <input value={form.location.city} onChange={(e) => setLoc("city", e.target.value)} placeholder="e.g. Ahmedabad" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">State *</label>
              <select value={form.location.state} onChange={(e) => setLoc("state", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100">
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Harvest Date + Moisture */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Harvest Date</label>
              <input type="date" value={form.harvestDate} onChange={(e) => set("harvestDate", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Moisture %</label>
              <input type="number" min="0" max="100" value={form.moisturePercent} onChange={(e) => set("moisturePercent", e.target.value)} placeholder="e.g. 12" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Describe your crop quality, storage conditions, etc." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none" />
          </div>

          {/* Image Upload */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Crop Image</label>
            <div onClick={() => fileRef.current?.click()} className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 hover:border-emerald-400 hover:bg-emerald-50/30 transition">
              {imgPreview ? (
                <img src={imgPreview} alt="preview" className="h-24 w-auto rounded-lg object-cover" />
              ) : (
                <>
                  <Upload size={20} className="text-slate-400" />
                  <p className="text-xs text-slate-500">Click to upload crop photo</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
            <motion.button type="submit" disabled={isPending} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition disabled:opacity-60">
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />}
              {isPending ? "Listing..." : "List Crop"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
