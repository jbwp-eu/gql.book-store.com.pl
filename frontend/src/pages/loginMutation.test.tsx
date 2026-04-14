import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { getGraphqlHttpUrl } from "../lib/graphqlClient";

/** Matches seeded admin in backend/db.ts and Login.tsx mutation. */
const ADMIN_EMAIL = "admin@test.pl";
const FAKE_TOKEN = "test.jwt.token";

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        isAdmin
      }
    }
  }
`;

function LoginMutationProbe() {
  const [email, setEmail] = useState<string>("");

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
            query: LOGIN_MUTATION,
            variables: { email: ADMIN_EMAIL, password: "any" },
          }),
        });
        const json = (await response.json()) as {
          data?: {
            login?: {
              token: string;
              user: { email: string; isAdmin: boolean };
            };
          };
        };
        const u = json.data?.login?.user;
        if (!cancelled) {
          setEmail(u?.email ?? "");
        }
      } catch {
        if (!cancelled) setEmail("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <span data-testid="login-user-email">{email}</span>;
}

describe("login mutation (pairs with backend login resolver)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: {
              login: {
                token: FAKE_TOKEN,
                user: {
                  id: "1",
                  name: "Admin",
                  email: ADMIN_EMAIL,
                  isAdmin: true,
                },
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

  it("maps GraphQL login JSON to UI", async () => {
    render(<LoginMutationProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("login-user-email")).toHaveTextContent(
        ADMIN_EMAIL
      );
    });
    expect(fetch).toHaveBeenCalled();
  });
});
