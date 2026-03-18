import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Expand, X, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

const optimizeCloudinary = (url) => {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto,w_1200/");
};

const PLACEHOLDER = "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1200&q=80";

export default function CropGallery({ images = [], cropName = "Crop" }) {
  const imgs = useMemo(() => {
    const valid = Array.isArray(images) ? images.filter(Boolean).map(optimizeCloudinary) : [];
    return valid.length ? valid : [PLACEHOLDER];
  }, [images]);

  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const prev = () => setActive((i) => (i - 1 + imgs.length) % imgs.length);
  const next = () => setActive((i) => (i + 1) % imgs.length);

  return (
    <>
      <div className="space-y-3">
        {/* Main image */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-100 border border-slate-200 group shadow-sm aspect-[4/3] w-full">
          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={imgs[active] || PLACEHOLDER}
              alt={`${cropName} ${active + 1}`}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => setFullscreen(true)}
              onError={(e) => { e.target.src = PLACEHOLDER; }}
            />
          </AnimatePresence>

          {/* gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

          {/* nav arrows */}
          {imgs.length > 1 && (
            <>
              <button onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                <ChevronLeft size={18} />
              </button>
              <button onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {/* fullscreen button */}
          <button onClick={() => setFullscreen(true)}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 text-xs font-medium hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-sm">
            <Expand size={13} /> Full Screen
          </button>

          {/* dot indicators */}
          {imgs.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {imgs.map((_, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={`rounded-full transition-all ${i === active ? "w-5 h-1.5 bg-green-600" : "w-1.5 h-1.5 bg-white/60 hover:bg-white"}`} />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {imgs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {imgs.map((img, i) => (
              <button key={i} onClick={() => setActive(i)}
                className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                  i === active
                    ? "border-green-600 ring-2 ring-green-100"
                    : "border-slate-200 opacity-60 hover:opacity-90"
                }`}>
                <img src={img || PLACEHOLDER} alt={`${cropName} ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = PLACEHOLDER; }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen lightbox */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setFullscreen(false)}
          >
            <button onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10">
              <X size={18} />
            </button>
            {imgs.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 z-10">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); next(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 z-10">
                  <ChevronRight size={20} />
                </button>
              </>
            )}
            <motion.img
              key={active}
              src={imgs[active] || PLACEHOLDER}
              alt={cropName}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => { e.target.src = PLACEHOLDER; }}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
              {active + 1} / {imgs.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
