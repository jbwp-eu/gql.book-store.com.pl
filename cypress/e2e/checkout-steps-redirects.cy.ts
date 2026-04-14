describe("checkout steps: redirects", () => {
  function visitHomeWithCleanStorage() {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  }

  function spaNavigate(pathname: string) {
    cy.window().then((win) => {
      win.history.pushState({}, "", pathname);
      win.dispatchEvent(new PopStateEvent("popstate"));
    });
  }

  function loginAndHydrateAuth() {
    cy.loginByApi();
    // `loginByApi` writes localStorage; reload to let redux auth slice hydrate.
    cy.reload();
  }

  function addAptekarkaToCartAndOpenCart() {
    cy.visit("product/aptekarka");
    cy.contains("button", "Dodaj do koszyka").should("be.visible").click();
    cy.contains("button", "Przejdź do koszyka", { timeout: 10000 })
      .should("be.visible")
      .click();
    cy.location("pathname").should("eq", "/pl/cart");
  }

  function goToShippingFromCart() {
    // Checkout is a Link button → renders as <a>.
    cy.contains("a", "Do kasy").should("be.visible").click();
    cy.location("pathname").should("eq", "/pl/shipping");
  }

  function fillShippingAddressAndSave() {
    cy.get('input[name="name"]').clear().type("Test User");
    cy.get('input[name="addressLine1"]').clear().type("Test Street 1");
    cy.get('input[name="city"]').clear().type("Warsaw");
    cy.get('input[name="postalCode"]').clear().type("00-000");
    cy.get('input[name="country"]').clear().type("Poland");
    cy.contains('button[type="submit"]', "Zapisz adres")
      .should("be.visible")
      .click();
  }

  it("redirects /shipping to /cart when cart is empty", () => {
    visitHomeWithCleanStorage();
    loginAndHydrateAuth();

    spaNavigate("/pl/shipping");
    cy.location("pathname").should("eq", "/pl/cart");
    cy.contains("Twój koszyk jest pusty").should("be.visible");
  });

  it("redirects /payment to /shipping when shipping address is missing", () => {
    visitHomeWithCleanStorage();
    loginAndHydrateAuth();

    // Add to cart and open cart (keeps redux state).
    addAptekarkaToCartAndOpenCart();

    // Navigate to payment within SPA without reloading (reload would clear redux cart).
    spaNavigate("/pl/payment");
    cy.location("pathname").should("eq", "/pl/shipping");
    cy.get("h1").should("contain.text", "Adres dostawy");
  });

  it("redirects /payment to /cart when cart is empty", () => {
    visitHomeWithCleanStorage();
    loginAndHydrateAuth();

    spaNavigate("/pl/payment");
    cy.location("pathname").should("eq", "/pl/cart");
    cy.contains("Twój koszyk jest pusty").should("be.visible");
  });

  it('disables "Dalej" until payment method is selected', () => {
    visitHomeWithCleanStorage();
    loginAndHydrateAuth();

    addAptekarkaToCartAndOpenCart();
    goToShippingFromCart();
    fillShippingAddressAndSave();

    // Continue to payment (enabled after saving address).
    cy.contains("a", "Przejdź do płatności").should("be.visible").click();
    cy.location("pathname").should("eq", "/pl/payment");
    cy.get("h1").should("contain.text", "Metoda płatności");

    cy.contains("button", "Dalej").should("be.disabled");
    cy.contains("label", "PayPal").click();
    cy.contains("button", "Dalej").should("not.be.disabled");
  });

  it("navigates to /checkout after selecting PayPal and continuing", () => {
    visitHomeWithCleanStorage();
    loginAndHydrateAuth();

    addAptekarkaToCartAndOpenCart();
    goToShippingFromCart();
    fillShippingAddressAndSave();
    cy.contains("a", "Przejdź do płatności").should("be.visible").click();

    cy.location("pathname").should("eq", "/pl/payment");
    cy.contains("label", "PayPal").click();
    cy.contains("button", "Dalej").should("not.be.disabled").click();

    cy.location("pathname").should("eq", "/pl/checkout");
  });
});

