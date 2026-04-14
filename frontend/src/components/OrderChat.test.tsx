import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../utils/auth", () => ({
  getAuthHeader: () => null,
}));

vi.mock("../socket/socket", () => ({
  connectSocketWithAuth: () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }),
}));

import OrderChat from "./OrderChat";

describe("OrderChat", () => {
  it("shows login required when not authenticated (and skips fetch)", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(<OrderChat orderId="order-1" currentUserId={null} />);

    expect(screen.getByText("Login required")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

