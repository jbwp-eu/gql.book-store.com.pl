import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { getGraphqlHttpUrl } from "../lib/graphqlClient";

const MOCK_NAME = "Test Store";
const MOCK_LAT = 52.1;
const MOCK_LNG = 21.0;

const STORE_LOCATION_QUERY = `
  query StoreLocation {
    storeLocation {
      name
      latitude
      longitude
    }
  }
`;

function StoreLocationQueryProbe() {
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
          },
          body: JSON.stringify({ query: STORE_LOCATION_QUERY }),
        });
        const json = (await response.json()) as {
          data?: {
            storeLocation?: {
              name: string;
              latitude: number;
              longitude: number;
            };
          };
        };
        const loc = json.data?.storeLocation;
        if (!cancelled) {
          setLine(
            loc
              ? `${loc.name}:${loc.latitude}:${loc.longitude}`
              : ""
          );
        }
      } catch {
        if (!cancelled) setLine("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <span data-testid="store-location-line">{line}</span>;
}

describe("storeLocation query (pairs with backend storeLocation resolver)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: {
              storeLocation: {
                name: MOCK_NAME,
                latitude: MOCK_LAT,
                longitude: MOCK_LNG,
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

  it("maps GraphQL storeLocation JSON to UI", async () => {
    render(<StoreLocationQueryProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("store-location-line")).toHaveTextContent(
        `${MOCK_NAME}:${MOCK_LAT}:${MOCK_LNG}`
      );
    });
    expect(fetch).toHaveBeenCalled();
  });
});
