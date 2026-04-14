import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { getGraphqlHttpUrl } from "../lib/graphqlClient";

const PRODUCT_ID = "aptekarka";
const REVIEW_COMMENT = "Great book!";

/** Same shape as ProductDetail.tsx REVIEWS_QUERY (subset). */
const REVIEWS_QUERY = `
  query ProductReviews($productId: ID!) {
    productReviews(productId: $productId) {
      id
      rating
      comment
      user {
        id
        name
      }
    }
  }
`;

function ProductReviewsQueryProbe() {
  const [comment, setComment] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(getGraphqlHttpUrl(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-App-Locale": "pl",
          },
          body: JSON.stringify({
            query: REVIEWS_QUERY,
            variables: { productId: PRODUCT_ID },
          }),
        });
        const json = (await response.json()) as {
          data?: {
            productReviews?: { comment: string }[];
          };
        };
        const first = json.data?.productReviews?.[0];
        if (!cancelled) {
          setComment(first?.comment ?? "");
        }
      } catch {
        if (!cancelled) setComment("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <span data-testid="first-review-comment">{comment}</span>;
}

describe("productReviews query (pairs with backend productReviews)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: {
              productReviews: [
                {
                  id: "1",
                  rating: 5,
                  comment: REVIEW_COMMENT,
                  user: { id: "1", name: "Admin" },
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps GraphQL productReviews JSON to UI", async () => {
    render(<ProductReviewsQueryProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("first-review-comment")).toHaveTextContent(
        REVIEW_COMMENT
      );
    });
    expect(fetch).toHaveBeenCalled();
  });
});
