export const SUPPORTED_LOCALES = ["pl", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "pl";

export function isAppLocale(s: string): s is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(s);
}

/** First path segment when it is a supported locale, otherwise default. */
export function getLocaleFromPathname(pathname: string): AppLocale {
  const first = pathname.split("/").filter(Boolean)[0];
  if (first && isAppLocale(first)) return first;
  return DEFAULT_LOCALE;
}

export function getLocaleFromRequest(request: Request): AppLocale {
  return getLocaleFromPathname(new URL(request.url).pathname);
}

/**
 * Path without the leading `/:lang` segment (for matching checkout steps, etc.).
 */
export function stripLocalePrefix(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  if (isAppLocale(parts[0])) {
    const rest = parts.slice(1);
    return rest.length === 0 ? "/" : `/${rest.join("/")}`;
  }
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

/** `path` is app-relative, e.g. `/cart` or `cart`. */
export function withLocalePath(locale: AppLocale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean === "/") return `/${locale}`;
  return `/${locale}${clean}`;
}

/** Same route under another locale; preserves query and hash. */
export function localizedFullPath(
  pathname: string,
  search: string,
  hash: string,
  locale: AppLocale
): string {
  const rest = stripLocalePrefix(pathname);
  return `${withLocalePath(locale, rest)}${search}${hash}`;
}

/** Use in loaders/actions: `redirect(localizedLoginPath(request))`. */
export function localizedLoginPath(request: Request): string {
  return withLocalePath(getLocaleFromRequest(request), "/login");
}

/** Client-only: `/pl/login` or `/en/login` from the current browser path. */
export function currentLocaleLoginHref(): string {
  return withLocalePath(getLocaleFromPathname(window.location.pathname), "/login");
}
