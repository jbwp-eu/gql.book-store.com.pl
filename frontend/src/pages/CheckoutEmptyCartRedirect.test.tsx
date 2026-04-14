import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

vi.mock("../store/cartSelectors", () => ({
  selectCartOrderTotals: () => ({
    itemsQuantity: 0,
    itemsPrice: 0,
    shippingPrice: 0,
    totalPrice: 0,
  }),
}));

vi.mock("../store/hooks", () => ({
  useAppSelector: (selector: any) =>
    selector({
      cart: {
        items: [],
        shippingAddress: null,
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
  it("redirects to /cart when cart is empty", () => {
    const router = createMemoryRouter(
      [
        { path: "/checkout", element: <CheckoutPage /> },
        { path: "/cart", element: <div>cart-page</div> },
      ],
      { initialEntries: ["/checkout"] }
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText("cart-page")).toBeInTheDocument();
  });
});
