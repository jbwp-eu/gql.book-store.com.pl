import { useParams } from "react-router";
import {
  DEFAULT_LOCALE,
  isAppLocale,
  withLocalePath,
  type AppLocale,
} from "../i18n/locales";

export function useLocale(): AppLocale {
  const { lang } = useParams();
  return lang && isAppLocale(lang) ? lang : DEFAULT_LOCALE;
}

/** Build a path under the current URL locale, e.g. `/pl/cart` from `/cart`. */
export function useLocalizedHref(relativePath: string): string {
  const locale = useLocale();
  return withLocalePath(locale, relativePath);
}
