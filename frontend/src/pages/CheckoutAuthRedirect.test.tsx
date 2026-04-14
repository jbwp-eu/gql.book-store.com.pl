import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

vi.mock("../components/CheckoutStepper", () => ({
  default: () => null,
}));

vi.mock("../store/cartSelectors", () => ({
  selectCartOrderTotals: () => ({
    itemsQuantity: 1,
    itemsPrice: 100,
    shippingPrice: 20,
    totalPrice: 120,
  }),
}));

vi.mock("../store/hooks", () => ({
  useAppSelector: (selector: any) =>
    selector({
      cart: {
        items: [{ productId: "p1", quantity: 1, price: 100, title: "T" }],
        shippingAddress: {
          name: "A",
          addressLine1: "B",
          city: "C",
          postalCode: "00-000",
          country: "PL",
        },
        selectedPaymentMethod: "paypal",
      },
    }),
}));

vi.mock("../../utils/auth", () => ({
  getAuthHeader: () => null,
}));

vi.mock("../context/CurrencyContext", () => ({
  useCurrency: () => ({ currency: "PLN" }),
}));

vi.mock("../hooks/useLocalizedPath", () => ({
  useLocale: () => "en",
  useLocalizedHref: (p: string) => p,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@paypal/react-paypal-js", () => ({
  PayPalButtons: () => null,
  PayPalScriptProvider: ({ children }: any) => children,
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(async () => null),
}));

describe("CheckoutPage auth redirect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it(
    "navigates to /login when PayPal is selected but user is not authenticated",
    async () => {
      const prev = process.env.VITE_PAYPAL_CLIENT_ID;
      process.env.VITE_PAYPAL_CLIENT_ID = "test";
      vi.resetModules();

      const { default: CheckoutPage } = await import("./Checkout");

      vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));

      const router = createMemoryRouter(
        [
          { path: "/checkout", element: <CheckoutPage /> },
          { path: "/login", element: <div>login-page</div> },
        ],
        { initialEntries: ["/checkout"] }
      );

      try {
        render(<RouterProvider router={router} />);

        await waitFor(() => {
          expect(screen.getByText("login-page")).toBeInTheDocument();
        });
      } finally {
        if (prev === undefined) delete process.env.VITE_PAYPAL_CLIENT_ID;
        else process.env.VITE_PAYPAL_CLIENT_ID = prev;
      }
    },
    10_000
  );
});

