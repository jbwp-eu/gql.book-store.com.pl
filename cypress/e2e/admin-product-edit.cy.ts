describe("admin actions: product edit", () => {
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

  it("can edit a product price and see it on product page", () => {
    const productId = "cienwiatru";
    const productTitle = "Cień wiatru";
    const newPrice = "60.99";

    visitHomeWithCleanStorage();
    loginAndHydrateAuth();

    cy.visit("admin/products");
    cy.location("pathname").should("eq", "/pl/admin/products");
    cy.get("h1").should("contain.text", "Lista produktów");

    cy.contains("tr", productTitle)
      .should("be.visible")
      .within(() => {
        cy.contains("a", "Edytuj").click();
      });

    cy.location("pathname").should("eq", `/pl/admin/products/${productId}/edit`);

    cy.get("input#price").clear().type(newPrice);
    cy.contains('button[type="submit"]', "Zapisz produkt")
      .should("be.visible")
      .click();

    cy.location("pathname").should("eq", "/pl/admin/products");
    cy.contains("tr", productTitle).within(() => {
      cy.contains("td", `${Number(newPrice).toFixed(2)} PLN`).should("be.visible");
    });

    cy.visit(`product/${productId}`);
    cy.location("pathname").should("eq", `/pl/product/${productId}`);
    cy.get("h1").should("contain.text", productTitle);
    cy.contains(`${Number(newPrice).toFixed(2)} PLN`).should("be.visible");
  });
});

