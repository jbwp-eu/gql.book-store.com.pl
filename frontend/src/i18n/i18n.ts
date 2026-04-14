import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, type AppLocale } from "./locales";
import { commonEn } from "./translations/en";
import { commonPl } from "./translations/pl";

void i18n.use(initReactI18next).init({
  showSupportNotice: false,
  resources: {
    en: { common: commonEn },
    pl: { common: commonPl },
  },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

/** Server actions / loaders: translate with a specific locale (no `useTranslation`). */
export function serverT(key: string, lng: AppLocale): string {
  return i18n.t(key, { lng });
}

export default i18n;
