import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { getGraphqlHttpUrl } from "../lib/graphqlClient";

const ERROR_MESSAGE = "Invalid email or password";

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
    }
  }
`;

function LoginMutationErrorProbe() {
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
            query: LOGIN_MUTATION,
            variables: { email: "admin@test.pl", password: "wrongpass" },
          }),
        });
        const json = (await response.json()) as {
          errors?: { message?: string }[];
        };
        const msg = json.errors?.[0]?.message ?? "";
        if (!cancelled) setErrorMessage(msg);
      } catch {
        if (!cancelled) setErrorMessage("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <span data-testid="login-error">{errorMessage}</span>;
}

describe("login mutation errors (pairs with backend invalidCredentials)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: { login: null },
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

  it("renders errors[0].message for login failure", async () => {
    render(<LoginMutationErrorProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toHaveTextContent(ERROR_MESSAGE);
    });
    expect(fetch).toHaveBeenCalled();
  });
});

