import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { getGraphqlHttpUrl } from "../lib/graphqlClient";

const ERROR_MESSAGE = "Unauthorized";

const DELETE_PRODUCT_MUTATION = `
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;

function GraphqlErrorProbe() {
  const [errorMessage, setErrorMessage] = useState<string>("");

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
          body: JSON.stringify({
            query: DELETE_PRODUCT_MUTATION,
            variables: { id: "aptekarka" },
          }),
        });
        const json = (await response.json()) as {
          errors?: { message?: string }[];
        };
        const msg = json.errors?.[0]?.message ?? "";
        if (!cancelled) {
          setErrorMessage(msg);
        }
      } catch {
        if (!cancelled) setErrorMessage("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <span data-testid="graphql-error">{errorMessage}</span>;
}

describe("GraphQL errors response (pairs with unauthorized mutations)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            errors: [{ message: ERROR_MESSAGE }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("surfaces errors[0].message from JSON", async () => {
    render(<GraphqlErrorProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("graphql-error")).toHaveTextContent(
        ERROR_MESSAGE
      );
    });
    expect(fetch).toHaveBeenCalled();
  });
});
