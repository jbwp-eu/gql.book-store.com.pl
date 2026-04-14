describe("cart", () => {
  function visitHomeWithCleanStorage() {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  }

  function addAptekarkaToCartAndOpenCart() {
    visitHomeWithCleanStorage();
    cy.visit("product/aptekarka");
    cy.contains("button", "Dodaj do koszyka").should("be.visible").click();
    // Cart is Redux in-memory; a full cy.visit("/cart") reloads and clears it.
    // Use the toast CTA (client-side navigate) like a user would.
    cy.contains("button", "Przejdź do koszyka", { timeout: 10000 })
      .should("be.visible")
      .click();
    cy.location("pathname").should("eq", "/pl/cart");
  }

  function withinAptekarkaRow(fn: () => void) {
    cy.contains("h6", "Aptekarka")
      .should("be.visible")
      .closest(".MuiCardContent-root")
      .within(fn);
  }

  it("shows empty state", () => {
    cy.visit("cart", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.location("pathname").should("eq", "/pl/cart");
    cy.contains("Twój koszyk jest pusty").should("be.visible");
    // MUI Button uses component={Link} → renders as <a>.
    cy.contains("a", "Kontynuuj zakupy").should("be.visible");
  });

  it("adds product from product page and shows it in cart", () => {
    addAptekarkaToCartAndOpenCart();
    cy.get("h1").should("contain.text", "Koszyk");
    cy.contains("Aptekarka").should("be.visible");
  });

  it("can increase and decrease quantity", () => {
    addAptekarkaToCartAndOpenCart();

    withinAptekarkaRow(() => {
      cy.get('button[aria-label="Zwiększ ilość"]').click();
      cy.get('button[aria-label="Zmniejsz ilość"]')
        .parent()
        .find("span")
        .should("contain.text", "2");

      cy.get('button[aria-label="Zmniejsz ilość"]').click();
      cy.get('button[aria-label="Zmniejsz ilość"]')
        .parent()
        .find("span")
        .should("contain.text", "1");
    });
  });

  it("can remove item from cart", () => {
    addAptekarkaToCartAndOpenCart();

    withinAptekarkaRow(() => {
      cy.get('button[aria-label="Usuń z koszyka"]').click();
    });

    cy.contains("Twój koszyk jest pusty").should("be.visible");
  });

  it("can clear cart", () => {
    addAptekarkaToCartAndOpenCart();
    cy.contains("button", "Wyczyść koszyk").should("be.visible").click();
    cy.contains("Twój koszyk jest pusty").should("be.visible");
  });

  it("checkout link sends unauthenticated users to login with redirect", () => {
    addAptekarkaToCartAndOpenCart();
    // Checkout is a Link button → renders as <a>.
    cy.contains("a", "Do kasy").should("be.visible").click();
    cy.location("pathname").should("eq", "/pl/login");
    cy.location("search").then((search) => {
      const redirect = new URLSearchParams(search).get("redirect");
      expect(redirect).to.eq("/pl/shipping");
    });
  });

  it("cart 'Zobacz produkt' navigates back to product page", () => {
    addAptekarkaToCartAndOpenCart();
    withinAptekarkaRow(() => {
      cy.contains("a", "Zobacz produkt").should("be.visible").click();
    });
    cy.location("pathname").should("eq", "/pl/product/aptekarka");
    cy.get("h1").should("contain.text", "Aptekarka");
  });
});

