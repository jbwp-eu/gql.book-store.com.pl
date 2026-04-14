import { describe, expect, it, vi } from "vitest";
import type { LoaderFunctionArgs } from "react-router";

vi.mock("../../utils/auth", () => ({
  getAuthHeader: () => null,
}));

import { loader } from "./MyReviews";

describe("MyReviews.loader unauthenticated", () => {
  it("throws Response(400) when GraphQL returns Unauthorized error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: { myReviews: null },
            errors: [{ message: "Unauthorized" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      })
    );

    const request = new Request("http://example.test/my-reviews", {
      headers: { "X-App-Locale": "en" },
    });

    await expect(loader({ request } as LoaderFunctionArgs)).rejects.toMatchObject(
      { status: 400 }
    );

    vi.unstubAllGlobals();
  });
});

