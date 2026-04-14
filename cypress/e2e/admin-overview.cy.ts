/**
 * Seeded admin user (isAdmin) can access AdminRoute and load adminOverview.
 */
describe("admin overview", () => {
  beforeEach(() => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.loginByApi();
  });

  it("loads overview for admin", () => {
    cy.visit("admin/overview");
    cy.location("pathname").should("eq", "/pl/admin/overview");
    cy.get("h1").should("contain.text", "Przegląd");
    cy.contains("Przychody").should("be.visible");
  });
});
