import type { AppLocale } from "./locales.js";
import {
  resolverMessages,
  type ResolverMessageKey,
} from "./messages.js";

export type TranslateParams = Record<string, string | number>;

function interpolate(
  template: string,
  params?: TranslateParams
): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : ""
  );
}

export function t(
  locale: AppLocale,
  key: ResolverMessageKey,
  params?: TranslateParams
): string {
  const bundle = resolverMessages[locale];
  const fallback = resolverMessages.en[key];
  const raw = bundle[key] ?? fallback;
  return interpolate(raw, params);
}

export type TranslateFn = (
  key: ResolverMessageKey,
  params?: TranslateParams
) => string;

export function makeT(locale: AppLocale): TranslateFn {
  return (key, params) => t(locale, key, params);
}
