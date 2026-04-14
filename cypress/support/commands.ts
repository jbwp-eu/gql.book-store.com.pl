declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Logs in via GraphQL and stores JWT in localStorage under TOKEN_KEY ("token").
       * Uses the same `login(email,password)` mutation as `frontend/src/pages/Login.tsx`.
       */
      loginByApi(options?: {
        email?: string;
        password?: string;
        graphqlUrl?: string;
        tokenKey?: string;
      }): Chainable<string>;
    }
  }
}

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id name email isAdmin }
    }
  }
`;

type LoginPayload = {
  token: string;
  user?: { id: string; name: string; email: string; isAdmin: boolean };
};

type LoginEnv = {
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  GRAPHQL_URL: string;
  TOKEN_KEY: string;
};

function loginByApiCommand(
  options?:
    | {
        email?: string;
        password?: string;
        graphqlUrl?: string;
        tokenKey?: string;
      }
    | undefined
): Cypress.Chainable<string> {
  return cy
    .env<LoginEnv>([
      "ADMIN_EMAIL",
      "ADMIN_PASSWORD",
      "GRAPHQL_URL",
      "TOKEN_KEY",
    ])
    .then((e) => {
      const email = options?.email ?? e.ADMIN_EMAIL;
      const password = options?.password ?? e.ADMIN_PASSWORD;
      const graphqlUrl = options?.graphqlUrl ?? e.GRAPHQL_URL;
      const tokenKey = options?.tokenKey ?? e.TOKEN_KEY;

      return cy
        .request({
          method: "POST",
          url: graphqlUrl,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-App-Locale": "pl",
          },
          body: {
            query: LOGIN_MUTATION,
            variables: { email, password },
          },
          failOnStatusCode: true,
        })
        .then((res) => {
          const errors = res.body?.errors as unknown;
          if (Array.isArray(errors) && errors.length > 0) {
            throw new Error(`GraphQL login errors: ${JSON.stringify(errors)}`);
          }
          const payload = res.body?.data?.login as LoginPayload | undefined;
          const token = payload?.token;
          expect(token, "login token").to.be.a("string").and.not.be.empty;
          if (typeof token !== "string" || token.length === 0) {
            throw new Error("login token missing after assertion");
          }
          return { token, payload };
        })
        .then(({ token, payload }) => {
          cy.window({ log: false }).then((win) => {
            win.localStorage.setItem(String(tokenKey), token);
            // `PrivateRoute` checks redux `auth.userInfo.email`, which is hydrated from `localStorage.userInfo`.
            // Mirror the app’s login flow so route guards work without UI login.
            win.localStorage.setItem(
              "userInfo",
              JSON.stringify({
                id: payload?.user?.id ?? null,
                name: payload?.user?.name ?? null,
                email: payload?.user?.email ?? null,
                isAdmin: Boolean(payload?.user?.isAdmin),
                token,
              })
            );
          });
          return cy.wrap(token, { log: false });
        });
    });
}

Cypress.Commands.add("loginByApi", loginByApiCommand);

export {};
