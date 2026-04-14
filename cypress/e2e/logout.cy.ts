describe("auth: logout", () => {
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

  it("logs out via UI, clears localStorage, and guards protected routes", () => {
    visitHomeWithCleanStorage();
    loginAndHydrateAuth();

    cy.visit("my-orders");
    cy.location("pathname").should("match", /^\/pl\/my-orders$/);
    cy.get("h1").should("contain.text", "Moje zamówienia");

    // Open desktop user menu via avatar letter (role=button), then click "Wyloguj".
    cy.get('nav [role="button"][aria-haspopup="true"]')
      .filter(":visible")
      .first()
      .click();
    cy.contains('[role="menu"] [role="menuitem"]', "Wyloguj")
      .should("be.visible")
      .click();

    cy.location("pathname").should("match", /^\/pl(\/login)?\/?$/);

    cy.window().then((win) => {
      expect(win.localStorage.getItem("token")).to.eq(null);
      expect(win.localStorage.getItem("userInfo")).to.eq(null);
    });

    // Unauthenticated users cannot load protected data; route should fail visibly.
    cy.visit("my-orders", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.location("pathname").should("eq", "/pl/my-orders");
    cy.contains("Wystąpił błąd", { timeout: 10000 }).should("be.visible");
  });
});

