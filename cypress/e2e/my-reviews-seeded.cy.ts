/**
 * Seeded DB creates a review for user 1 with comment "Great book!" (see backend/db.ts).
 */
describe("my reviews: seeded review", () => {
  beforeEach(() => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.loginByApi();
  });

  it("shows the seeded review comment", () => {
    cy.visit("my-reviews");
    cy.location("pathname").should("eq", "/pl/my-reviews");
    cy.get("h1").should("contain.text", "Moje opinie");
    cy.contains("Great book!").should("be.visible");
    cy.get("table tbody tr")
      .first()
      .within(() => {
        cy.get("td").eq(1).should("have.text", "5");
      });
  });
});
