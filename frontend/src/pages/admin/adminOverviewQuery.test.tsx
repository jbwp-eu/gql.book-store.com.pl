import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { getGraphqlHttpUrl } from "../../lib/graphqlClient";

const MOCK_PRODUCTS_COUNT = 42;
const MOCK_USERS_COUNT = 2;

/** Subset of Overview.tsx `OVERVIEW_QUERY`. */
const OVERVIEW_QUERY = `
  query AdminOverview {
    adminOverview {
      productsCount
      usersCount
    }
  }
`;

function AdminOverviewProbe() {
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
          body: JSON.stringify({ query: OVERVIEW_QUERY }),
        });
        const json = (await response.json()) as {
          data?: {
            adminOverview?: { productsCount: number; usersCount: number };
          };
        };
        const o = json.data?.adminOverview;
        if (!cancelled && o) {
          setLine(`${o.productsCount}/${o.usersCount}`);
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

  return <span data-testid="admin-overview-counts">{line}</span>;
}

describe("adminOverview query (pairs with backend admin resolver)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: {
              adminOverview: {
                productsCount: MOCK_PRODUCTS_COUNT,
                usersCount: MOCK_USERS_COUNT,
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

  it("maps GraphQL adminOverview JSON to UI", async () => {
    render(<AdminOverviewProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-overview-counts")).toHaveTextContent(
        `${MOCK_PRODUCTS_COUNT}/${MOCK_USERS_COUNT}`
      );
    });
    expect(fetch).toHaveBeenCalled();
  });
});
