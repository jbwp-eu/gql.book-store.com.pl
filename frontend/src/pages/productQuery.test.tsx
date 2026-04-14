import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { getGraphqlHttpUrl } from "../lib/graphqlClient";

/** Matches catalog seed used with backend `product` resolver. */
const SEED_PRODUCT_ID = "aptekarka";
const SEED_PRODUCT_TITLE = "Aptekarka";
const SEED_PRODUCT_PRICE = 49.99;

/** Same shape as [ProductDetail.tsx](ProductDetail.tsx) loader query (subset). */
const PRODUCT_QUERY = `
  query ($id: ID!) {
    product(id: $id) {
      id
      title
      price
    }
  }
`;

function ProductQueryProbe() {
  const [line, setLine] = useState<string | null>(null);

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
            query: PRODUCT_QUERY,
            variables: { id: SEED_PRODUCT_ID },
          }),
        });
        const json = (await response.json()) as {
          data?: { product?: { id: string; title: string; price: number } };
        };
        const p = json.data?.product;
        if (!cancelled && p) {
          setLine(`${p.title} ${p.price}`);
        } else if (!cancelled) {
          setLine("");
        }
      } catch {
        if (!cancelled) setLine("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <span data-testid="product-line">{line ?? ""}</span>;
}

describe("product query (pairs with backend product resolver)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: {
              product: {
                id: SEED_PRODUCT_ID,
                title: SEED_PRODUCT_TITLE,
                price: SEED_PRODUCT_PRICE,
              },
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

  it("maps GraphQL product JSON to UI", async () => {
    render(<ProductQueryProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("product-line")).toHaveTextContent(
        `${SEED_PRODUCT_TITLE} ${SEED_PRODUCT_PRICE}`
      );
    });
    expect(fetch).toHaveBeenCalled();
  });
});
