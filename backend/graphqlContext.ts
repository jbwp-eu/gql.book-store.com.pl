import type { AppLocale } from "./i18n/locales.js";
import type { TranslateFn } from "./i18n/t.js";

export type GraphQLContext = {
  userId: string | null;
  locale: AppLocale;
  t: TranslateFn;
};
