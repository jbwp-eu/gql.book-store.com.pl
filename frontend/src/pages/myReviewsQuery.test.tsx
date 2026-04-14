import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { getGraphqlHttpUrl } from "../lib/graphqlClient";

const MOCK_REVIEW_ID = "review-1";
const MOCK_RATING = 4;


const MY_REVIEWS_QUERY = `
  query MyReviews {
    myReviews {
      id
      rating
      comment
    }
  }
`;

function MyReviewsQueryProbe() {
  const [line, setLine] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(getGraphqlHttpUrl(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-App-Locale": "en",
            Authorization: "Bearer fake.jwt",
          },
          body: JSON.stringify({ query: MY_REVIEWS_QUERY }),
        });
        const json = (await response.json()) as {
          data?: { myReviews?: { id: string; rating: number }[] };
        };
        const first = json.data?.myReviews?.[0];
        if (!cancelled) setLine(first ? `${first.id}:${first.rating}` : "");
      } catch {
        if (!cancelled) setLine("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <span data-testid="my-review-line">{line}</span>;
}

describe("myReviews query (pairs with backend myReviews resolver)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: {
              myReviews: [
                { id: MOCK_REVIEW_ID, rating: MOCK_RATING, comment: "Nice" },
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

  it("maps GraphQL myReviews JSON to UI", async () => {
    render(<MyReviewsQueryProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("my-review-line")).toHaveTextContent(
        `${MOCK_REVIEW_ID}:${MOCK_RATING}`
      );
    });
    expect(fetch).toHaveBeenCalled();
  });
});

