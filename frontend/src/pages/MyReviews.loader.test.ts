import { describe, expect, it, vi } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import { loader } from "./MyReviews";

describe("MyReviews.loader", () => {
  it("throws Response(400) when GraphQL returns errors", async () => {
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

    let thrown: unknown;
    try {
      await loader({ request } as LoaderFunctionArgs);
    } catch (err) {
      thrown = err;
    } finally {
      vi.unstubAllGlobals();
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(400);
  });
});

