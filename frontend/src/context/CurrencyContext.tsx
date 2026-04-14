import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  graphqlJsonHeaders,
  localeFromI18nLanguage,
} from "../lib/graphqlHeaders";
import { graphqlRequest } from "../lib/graphqlClient";

type CurrencyContextValue = {
  currency: string;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(
  undefined
);

type CurrencyProviderProps = {
  children: React.ReactNode;
};

const CURRENCY_QUERY = `
  query {
    currency
  }
`;

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const { i18n } = useTranslation();
  const [currency, setCurrency] = useState<string>("PLN");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const json = (await graphqlRequest({
          query: CURRENCY_QUERY,
          headers: graphqlJsonHeaders(localeFromI18nLanguage(i18n.language)),
        })) as {
          data?: { currency?: string };
          errors?: { message?: string }[];
        };

        const nextCurrency = json.data?.currency;
        if (!cancelled && typeof nextCurrency === "string" && nextCurrency) {
          setCurrency(nextCurrency);
        }
      } catch {
        // Keep fallback "PLN".
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  const value = useMemo<CurrencyContextValue>(() => ({ currency }), [currency]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return ctx;
}

