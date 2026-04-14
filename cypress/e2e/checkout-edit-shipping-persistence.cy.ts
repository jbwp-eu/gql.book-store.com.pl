describe("checkout: edit shipping persistence", () => {
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

  function addAptekarkaToCartAndOpenCart() {
    cy.visit("product/aptekarka");
    cy.contains("button", "Dodaj do koszyka").should("be.visible").click();
    cy.contains("button", "Przejdź do koszyka", { timeout: 10000 })
      .should("be.visible")
      .click();
    cy.location("pathname").should("eq", "/pl/cart");
  }

  function goToShippingFromCart() {
    cy.contains("a", "Do kasy").should("be.visible").click();
    cy.location("pathname").should("eq", "/pl/shipping");
    cy.get("h1").should("contain.text", "Adres dostawy");
  }

  function fillShippingAddressAndSave(city: string) {
    // These are MUI TextFields wired via react-hook-form; selecting by name is stable enough.
    cy.get('input[name="name"]').clear().type("Test User");
    cy.get('input[name="addressLine1"]').clear().type("Test Street 1");
    cy.get('input[name="city"]').clear().type(city);
    cy.get('input[name="postalCode"]').clear().type("00-000");
    cy.get('input[name="country"]').clear().type("Poland");
    cy.contains('button[type="submit"]', "Zapisz adres")
      .should("be.visible")
      .click();
  }

  it("keeps payment selection and uses updated shipping after editing from checkout", () => {
    const city1 = "Warsaw";
    const city2 = "Gdansk";

    visitHomeWithCleanStorage();
    loginAndHydrateAuth();

    addAptekarkaToCartAndOpenCart();
    goToShippingFromCart();
    fillShippingAddressAndSave(city1);

    cy.contains("a", "Przejdź do płatności").should("be.visible").click();
    cy.location("pathname").should("eq", "/pl/payment");
    cy.get("h1").should("contain.text", "Metoda płatności");

    cy.contains("label", "PayPal").click();
    cy.contains("button", "Dalej").should("not.be.disabled").click();

    cy.location("pathname").should("eq", "/pl/checkout");
    cy.get("h1").should("contain.text", "Podsumowanie zamówienia");
    cy.contains(city1).should("be.visible");

    // Edit shipping from checkout.
    cy.contains("button", "Edytuj adres dostawy").should("be.visible").click();
    cy.location("pathname").should("eq", "/pl/shipping");

    fillShippingAddressAndSave(city2);

    // Go forward again; payment method should still be selected.
    cy.contains("a", "Przejdź do płatności").should("be.visible").click();
    cy.location("pathname").should("eq", "/pl/payment");
    cy.get('input[name="payment-method"][value="paypal"]').should("be.checked");

    cy.contains("button", "Dalej").should("not.be.disabled").click();
    cy.location("pathname").should("eq", "/pl/checkout");
    cy.contains(city2).should("be.visible");
    cy.contains(city1).should("not.exist");
  });
});

