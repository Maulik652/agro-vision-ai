import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import useLanguageStore, { LANGUAGES } from "../../store/languageStore";
import toast from "react-hot-toast";

/**
 * LanguageSwitcher
 * Compact dropdown to switch between English, Hindi, and Gujarati.
 * Can be placed in any navbar or sidebar.
 */
export default function LanguageSwitcher({ compact = false }) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (code) => {
    if (code === language) { setOpen(false); return; }
    setLanguage(code);
    setOpen(false);
    toast.success(t("language.changed"), { icon: "🌐", duration: 2000 });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-1.5 rounded-xl border transition-all ${
          compact
            ? "px-2 py-1.5 text-xs bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            : "px-3 py-2 text-sm bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
        }`}
        aria-label={t("language.select")}
      >
        <Globe size={compact ? 13 : 15} className="text-emerald-600 shrink-0" />
        {!compact && (
          <span className="font-medium">{current.nativeLabel}</span>
        )}
        {compact && (
          <span className="font-medium uppercase">{current.code}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden min-w-[160px]"
          >
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {t("language.select")}
              </p>
            </div>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                  lang.code === language
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="text-base leading-none">{lang.flag}</span>
                <span className="flex-1 text-left font-medium">{lang.nativeLabel}</span>
                <span className="text-[10px] text-slate-400">{lang.label}</span>
                {lang.code === language && (
                  <Check size={13} className="text-emerald-600 shrink-0" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
