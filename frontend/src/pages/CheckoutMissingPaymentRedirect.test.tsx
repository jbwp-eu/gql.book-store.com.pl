import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

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
        selectedPaymentMethod: null,
      },
    }),
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

import CheckoutPage from "./Checkout";

describe("CheckoutPage redirects", () => {
  it("redirects to /payment when selectedPaymentMethod is missing", () => {
    const router = createMemoryRouter(
      [
        { path: "/checkout", element: <CheckoutPage /> },
        { path: "/payment", element: <div>payment-page</div> },
      ],
      { initialEntries: ["/checkout"] }
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText("payment-page")).toBeInTheDocument();
  });
});

