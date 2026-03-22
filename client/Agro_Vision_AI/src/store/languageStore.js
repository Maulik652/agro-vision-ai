import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n from "../i18n";

export const LANGUAGES = [
  { code: "en", label: "English",    nativeLabel: "English",    flag: "🇬🇧" },
  { code: "hi", label: "Hindi",      nativeLabel: "हिंदी",       flag: "🇮🇳" },
  { code: "gu", label: "Gujarati",   nativeLabel: "ગુજરાતી",     flag: "🇮🇳" },
];

const useLanguageStore = create(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (code) => {
        i18n.changeLanguage(code);
        set({ language: code });
      },
    }),
    {
      name: "agrovision_lang",
      // Sync i18n on rehydration
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);

export default useLanguageStore;
