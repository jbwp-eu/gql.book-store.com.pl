import { render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../i18n/i18n";
import { CurrencyProvider, useCurrency } from "./CurrencyContext";

/** Same contract as backend `currency` resolver when `CURRENCY=eur`. */
const CURRENCY_FROM_API = "EUR";

function CurrencyProbe() {
  const { currency } = useCurrency();
  return <span data-testid="currency">{currency}</span>;
}

describe("CurrencyProvider", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ data: { currency: CURRENCY_FROM_API } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads currency from GraphQL JSON (pairs with backend currency resolver)", async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <CurrencyProvider>
          <CurrencyProbe />
        </CurrencyProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("currency")).toHaveTextContent(
        CURRENCY_FROM_API
      );
    });
    expect(fetch).toHaveBeenCalled();
  });
});
