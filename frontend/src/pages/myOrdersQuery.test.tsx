import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { getGraphqlHttpUrl } from "../lib/graphqlClient";

const MOCK_ORDER_ID = "order-1";
const MOCK_TOTAL = 100;

const MY_ORDERS_QUERY = `
  query MyOrders {
    myOrders {
      id
      totalPrice
    }
  }
`;

function MyOrdersQueryProbe() {
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
          body: JSON.stringify({ query: MY_ORDERS_QUERY }),
        });
        const json = (await response.json()) as {
          data?: { myOrders?: { id: string; totalPrice: number }[] };
        };
        const list = json.data?.myOrders ?? [];
        const first = list[0];
        if (!cancelled) {
          setLine(first ? `${first.id}:${first.totalPrice}` : "");
        }
      } catch {
        if (!cancelled) setLine("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <span data-testid="my-order-line">{line}</span>;
}

describe("myOrders query (pairs with backend myOrders resolver)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: {
              myOrders: [
                { id: MOCK_ORDER_ID, totalPrice: MOCK_TOTAL },
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

  it("maps GraphQL myOrders JSON to UI", async () => {
    render(<MyOrdersQueryProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("my-order-line")).toHaveTextContent(
        `${MOCK_ORDER_ID}:${MOCK_TOTAL}`
      );
    });
    expect(fetch).toHaveBeenCalled();
  });
});
