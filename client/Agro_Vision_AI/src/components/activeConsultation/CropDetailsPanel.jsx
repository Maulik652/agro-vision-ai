import { motion } from "framer-motion";
import { User, MapPin, Leaf, AlertCircle, Image as ImageIcon, Phone, Mail } from "lucide-react";

const PRIORITY_STYLE = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high:   "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low:    "bg-slate-100 text-slate-600 border-slate-200"
};
const CATEGORY_STYLE = {
  disease:   "bg-red-50 text-red-700",
  pest:      "bg-orange-50 text-orange-700",
  nutrition: "bg-yellow-50 text-yellow-700",
  irrigation:"bg-sky-50 text-sky-700",
  market:    "bg-purple-50 text-purple-700",
  weather:   "bg-blue-50 text-blue-700",
  general:   "bg-slate-50 text-slate-600"
};

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-slate-400">{label}</p>
        <p className="text-xs text-slate-800 font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function CropDetailsPanel({ consultation }) {
  if (!consultation) return (
    <div className="p-4 text-center text-slate-400 text-xs py-12">Select a consultation</div>
  );

  const { user, cropType, problemCategory, description, images = [], priority, farmLocation } = consultation;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 space-y-4">
      {/* Farmer info */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden shrink-0">
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              : (user?.name?.[0] || "U").toUpperCase()
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{user?.name || "Unknown"}</p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.role || "farmer"}</p>
          </div>
        </div>
        <div className="space-y-2 pt-1 border-t border-slate-50">
          <InfoRow icon={Mail} label="Email" value={user?.email} />
          <InfoRow icon={Phone} label="Phone" value={user?.phone} />
          <InfoRow icon={MapPin} label="Location" value={
            farmLocation?.city || user?.city
              ? `${farmLocation?.city || user?.city || ""}${farmLocation?.state || user?.state ? `, ${farmLocation?.state || user?.state}` : ""}`
              : null
          } />
        </div>
      </div>

      {/* Crop & Problem */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-slate-900">{cropType}</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${PRIORITY_STYLE[priority] || PRIORITY_STYLE.medium}`}>
            {priority}
          </span>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${CATEGORY_STYLE[problemCategory] || CATEGORY_STYLE.general}`}>
          <AlertCircle size={11} />
          {problemCategory}
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
      </div>

      {/* Images */}
      {images.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={13} className="text-slate-400" />
            <p className="text-xs font-medium text-slate-700">Uploaded Images ({images.length})</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {images.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`crop-${i}`} loading="lazy"
                  className="w-full h-24 object-cover rounded-lg border border-slate-100 hover:opacity-90 transition" />
              </a>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
