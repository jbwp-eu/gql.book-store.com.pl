import type { AppLocale } from "../i18n/locales";
import { DEFAULT_LOCALE, isAppLocale } from "../i18n/locales";
import { getAuthHeader } from "../../utils/auth";

/** Headers for JSON GraphQL POST requests; includes locale for server-side error messages. */
export function graphqlJsonHeaders(locale: AppLocale): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-App-Locale": locale,
  };
}

/** Same as `graphqlJsonHeaders`, plus `Authorization` when the user has a token (localStorage). */
export function graphqlFetchHeaders(
  locale: AppLocale,
  auth: ReturnType<typeof getAuthHeader>
): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-App-Locale": locale,
  };
  if (auth?.Authorization) {
    headers.Authorization = auth.Authorization;
  }
  return headers;
}

/** Map i18next language (e.g. from `useTranslation`) to `AppLocale`. */
export function localeFromI18nLanguage(lang: string | undefined): AppLocale {
  if (lang && isAppLocale(lang)) return lang;
  return DEFAULT_LOCALE;
}
