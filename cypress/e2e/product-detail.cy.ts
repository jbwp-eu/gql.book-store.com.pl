/**
 * First catalog product in seed data: id `aptekarka`, title „Aptekarka” (backend/products.ts).
 */
describe("product detail: seeded catalog", () => {
  it("loads product page by id", () => {
    cy.visit("product/aptekarka");
    cy.location("pathname").should("eq", "/pl/product/aptekarka");
    cy.get("h1").should("contain.text", "Aptekarka");
    cy.contains("Wystąpił błąd").should("not.exist");
  });
});
