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
        shippingAddress: null,
        selectedPaymentMethod: "paypal",
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
  it("redirects to /shipping when shippingAddress is missing", () => {
    const router = createMemoryRouter(
      [
        { path: "/checkout", element: <CheckoutPage /> },
        { path: "/shipping", element: <div>shipping-page</div> },
      ],
      { initialEntries: ["/checkout"] }
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText("shipping-page")).toBeInTheDocument();
  });
});

