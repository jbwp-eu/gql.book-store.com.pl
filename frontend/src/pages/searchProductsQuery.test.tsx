import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { getGraphqlHttpUrl } from "../lib/graphqlClient";

const SEED_PRODUCT_ID = "aptekarka";
const SEED_PRODUCT_TITLE = "Aptekarka";
const SEARCH_NEEDLE = "Apte";

const SEARCH_PRODUCTS_QUERY = `
  query ($q: String!) {
    searchProducts(query: $q) {
      id
      title
    }
  }
`;

function SearchProductsQueryProbe() {
  const [titles, setTitles] = useState<string>("");

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
            query: SEARCH_PRODUCTS_QUERY,
            variables: { q: SEARCH_NEEDLE },
          }),
        });
        const json = (await response.json()) as {
          data?: { searchProducts?: { id: string; title: string }[] };
        };
        const list = json.data?.searchProducts ?? [];
        if (!cancelled) {
          setTitles(list.map((p) => p.title).join(","));
        }
      } catch {
        if (!cancelled) setTitles("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <span data-testid="search-titles">{titles}</span>;
}

describe("searchProducts query (pairs with backend searchProducts)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: {
              searchProducts: [
                { id: SEED_PRODUCT_ID, title: SEED_PRODUCT_TITLE },
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

  it("maps GraphQL searchProducts JSON to UI", async () => {
    render(<SearchProductsQueryProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("search-titles")).toHaveTextContent(
        SEED_PRODUCT_TITLE
      );
    });
    expect(fetch).toHaveBeenCalled();
  });
});
