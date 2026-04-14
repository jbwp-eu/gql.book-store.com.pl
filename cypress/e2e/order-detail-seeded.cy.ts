/**
 * Seeded DB (`db.ts`) creates order id "1" for user id "1" (admin).
 * Admin sees the order details heading (not "thank you").
 */
describe("order detail: seeded order", () => {
  beforeEach(() => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.loginByApi();
  });

  it("loads seeded order 1 for admin", () => {
    cy.visit("order/1");
    cy.location("pathname").should("eq", "/pl/order/1");
    cy.get("h1").should("contain.text", "Szczegóły zamówienia");
    cy.contains(/Numer zamówienia:\s*1/).should("be.visible");
  });
});
