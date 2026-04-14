import type { IncomingHttpHeaders } from "http";
import type { RequestHeaders } from "graphql-http";

export const SUPPORTED_LOCALES = ["pl", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function isAppLocale(s: string): s is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(s);
}

function readXAppLocale(
  headers:
    | IncomingHttpHeaders
    | NodeJS.Dict<string | string[] | undefined>
    | { get(name: string): string | null }
    | RequestHeaders
): string | undefined {
  
  if ("get" in headers && typeof headers.get === "function") {
    return headers.get("x-app-locale") ?? undefined;
  }
  const raw = (headers as Record<string, string | string[] | undefined>)[
    "x-app-locale"
  ];
  return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
}

/**
 * Reads `X-App-Locale` (Express lowercases header names to `x-app-locale`;
 * Fetch-style `Headers` with `.get()` is also supported — used by graphql-http).
 * Defaults to English when missing or invalid.
 */
export function parseLocaleFromHeaders(
  headers:
    | IncomingHttpHeaders
    | NodeJS.Dict<string | string[] | undefined>
    | { get(name: string): string | null }
    | RequestHeaders
): AppLocale {
  const value = readXAppLocale(headers);
  const trimmed = value?.trim();
  if (trimmed && isAppLocale(trimmed)) {
    return trimmed;
  }
  return "en";
}
