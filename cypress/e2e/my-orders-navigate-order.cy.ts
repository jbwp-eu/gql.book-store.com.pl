/**
 * Seeded order id "1" appears on My Orders; "Zobacz" is admin.view (PL).
 */
describe("my orders: navigate to order detail", () => {
  beforeEach(() => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.loginByApi();
    cy.reload();
  });

  it('opens seeded order 1 via "Zobacz"', () => {
    cy.visit("my-orders");
    cy.location("pathname").should("eq", "/pl/my-orders");
    // MUI Button uses component={Link} → renders as <a>, not <button>.
    cy.get("table tbody tr")
      .contains("td", "...1")
      .parents("tr")
      .first()
      .within(() => {
        cy.contains("a", "Zobacz").should("be.visible").click();
      });
    cy.location("pathname").should("eq", "/pl/order/1");
    cy.get("h1").should("contain.text", "Szczegóły zamówienia");
  });
});
