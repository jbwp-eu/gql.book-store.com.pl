import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { getGraphqlHttpUrl } from "../lib/graphqlClient";

/** Matches first seed product in backend/products.ts. */
const SEED_PRODUCT_ID = "aptekarka";
const SEED_PRODUCT_TITLE = "Aptekarka";

const PRODUCTS_QUERY = `
  query {
    products {
      id
      title
    }
  }
`;

function ProductsQueryProbe() {
  const [title, setTitle] = useState<string | null>(null);

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
          body: JSON.stringify({ query: PRODUCTS_QUERY }),
        });
        const json = (await response.json()) as {
          data?: { products?: { id: string; title: string }[] };
        };
        const list = json.data?.products ?? [];
        const found = list.find((p) => p.id === SEED_PRODUCT_ID);
        if (!cancelled) {
          setTitle(found?.title ?? "");
        }
      } catch {
        if (!cancelled) setTitle("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <span data-testid="seed-product-title">{title ?? ""}</span>;
}

describe("products query (pairs with backend seeded products)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: {
              products: [
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

  it("maps GraphQL products JSON to UI", async () => {
    render(<ProductsQueryProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("seed-product-title")).toHaveTextContent(
        SEED_PRODUCT_TITLE
      );
    });
    expect(fetch).toHaveBeenCalled();
  });
});
