import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { getGraphqlHttpUrl } from "../lib/graphqlClient";

const CONTACT_MUTATION = `
  mutation SendContact($input: ContactMessageInput!) {
    sendContactMessage(input: $input) {
      success
      error
    }
  }
`;

function ContactMutationProbe() {
  const [success, setSuccess] = useState<boolean | null>(null);

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
            query: CONTACT_MUTATION,
            variables: {
              input: {
                email: "user@example.com",
                message: "Hello from test",
              },
            },
          }),
        });
        const json = (await response.json()) as {
          data?: { sendContactMessage?: { success: boolean; error: string | null } };
        };
        const payload = json.data?.sendContactMessage;
        if (!cancelled) {
          setSuccess(payload?.success ?? null);
        }
      } catch {
        if (!cancelled) setSuccess(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span data-testid="contact-success">
      {success === null ? "" : String(success)}
    </span>
  );
}

describe("sendContactMessage mutation (pairs with backend contact resolver)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: {
              sendContactMessage: { success: true, error: null },
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

  it("maps GraphQL sendContactMessage JSON to UI", async () => {
    render(<ContactMutationProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("contact-success")).toHaveTextContent("true");
    });
    expect(fetch).toHaveBeenCalled();
  });
});
