describe("smoke: auth + protected route", () => {
  it("shows an error when unauthenticated", () => {
    cy.visit("my-orders", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.location("pathname").should("eq", "/pl/my-orders");
    cy.contains("Wystąpił błąd", { timeout: 10000 }).should("be.visible");
  });

  it("can login via API and open My Orders", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.loginByApi();
    cy.visit("my-orders");
    cy.location("pathname").should("match", /^\/pl\/my-orders$/);
  });
});

