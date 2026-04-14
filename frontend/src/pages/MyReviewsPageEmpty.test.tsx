import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router", () => ({
  Link: ({ children }: any) => children,
  useLoaderData: () => [],
}));

vi.mock("../hooks/useLocalizedPath", () => ({
  useLocale: () => "en",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import MyReviewsPage from "./MyReviews";

describe("MyReviewsPage", () => {
  it("renders empty state when loader returns no reviews", () => {
    render(<MyReviewsPage />);
    expect(screen.getByText("account.emptyReviews")).toBeInTheDocument();
  });
});

