/**
 * Checkout is under PrivateRoute; unauthenticated users are sent to login with redirect back.
 */
describe("checkout: unauthenticated redirect", () => {
  it("redirects to login with redirect param", () => {
    cy.visit("checkout", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    cy.location("pathname").should("eq", "/pl/login");
    cy.location("search").should("include", "redirect=");
    cy.location("search").then((search) => {
      const redirect = new URLSearchParams(search).get("redirect");
      expect(redirect, "redirect query").to.eq("/pl/checkout");
    });
  });
});
