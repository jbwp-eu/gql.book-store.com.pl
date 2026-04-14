describe("admin actions: user delete", () => {
  const GRAPHQL_URL = "http://localhost:4000/graphql";

  function visitHomeWithCleanStorage() {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  }

  function loginAndHydrateAuth() {
    cy.loginByApi();
    cy.reload();
  }

  function registerUserByApi(input: { name: string; email: string; password: string }) {
    const REGISTER_MUTATION = `
      mutation Register($input: RegisterInput!) {
        register(input: $input) {
          token
          user { id name email isAdmin }
        }
      }
    `;
    return cy.request({
      method: "POST",
      url: GRAPHQL_URL,
      headers: {
        "Content-Type": "application/json",
        "X-App-Locale": "pl",
      },
      body: {
        query: REGISTER_MUTATION,
        variables: { input },
      },
    });
  }

  it("can delete a newly registered non-admin user", () => {
    const nonce = Date.now();
    const newUser = {
      name: `User ${nonce}`,
      email: `user${nonce}@test.pl`,
      password: "password123",
    };

    visitHomeWithCleanStorage();

    // Create non-admin user via API.
    registerUserByApi(newUser).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body?.errors, "register errors").to.not.exist;
      const created = res.body?.data?.register?.user as
        | { id: string; email: string; isAdmin?: boolean }
        | undefined;
      expect(created?.email).to.eq(newUser.email);
      expect(Boolean(created?.isAdmin)).to.eq(false);
    });

    // Now login as admin and delete that user in the admin UI.
    loginAndHydrateAuth();
    cy.visit("admin/users");
    cy.location("pathname").should("eq", "/pl/admin/users");
    cy.get("h1").should("contain.text", "Lista użytkowników");

    cy.contains("tr", newUser.email)
      .should("be.visible")
      .within(() => {
        cy.contains("button", "Usuń").click();
      });

    cy.contains("h2", "Usuń użytkownika").should("be.visible");
    cy.get('[role="dialog"]').within(() => {
      cy.contains("button", "Usuń").should("be.visible").click();
    });

    cy.contains("tr", newUser.email).should("not.exist");
  });
});

