import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en/translation.json";
import hi from "./locales/hi/translation.json";
import gu from "./locales/gu/translation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      gu: { translation: gu },
    },
    // Supported languages
    supportedLngs: ["en", "hi", "gu"],
    // Default fallback
    fallbackLng: "en",
    // Detection order: localStorage → navigator → fallback
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "agrovision_lang",
      caches: ["localStorage"],
    },
    interpolation: {
      // React already escapes values
      escapeValue: false,
    },
    // Don't suspend render while loading (translations are bundled)
    react: {
      useSuspense: false,
    },
  });

export default i18n;
