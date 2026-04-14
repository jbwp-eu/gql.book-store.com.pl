describe("checkout: config + placeOrder", () => {
  function visitHomeWithCleanStorage() {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  }

  function loginAndHydrateAuth() {
    return cy.loginByApi().then((token) => cy.reload().then(() => token));
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

  it("does not show PayPal key missing message when PayPal is configured", () => {
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
    cy.contains("Brak identyfikatora klienta PayPal.").should("not.exist");
  });

  it("does not show Stripe key missing message when Stripe is configured", () => {
    visitHomeWithCleanStorage();
    loginAndHydrateAuth();

    addAptekarkaToCartAndOpenCart();
    goToShippingFromCart();
    fillShippingAddressAndSave();
    cy.contains("a", "Przejdź do płatności").should("be.visible").click();

    cy.location("pathname").should("eq", "/pl/payment");
    cy.contains("label", "Stripe").click();
    cy.contains("button", "Dalej").should("not.be.disabled").click();

    cy.location("pathname").should("eq", "/pl/checkout");
    cy.contains("Brak klucza publicznego Stripe.").should("not.exist");
  });

  it("can create an order via placeOrder mutation (stripe) and view it", () => {
    visitHomeWithCleanStorage();

    loginAndHydrateAuth().then((token) => {
      const GRAPHQL_URL = "http://localhost:4000/graphql";

      cy.request({
        method: "POST",
        url: GRAPHQL_URL,
        headers: {
          "Content-Type": "application/json",
          "X-App-Locale": "pl",
          Authorization: `Bearer ${token}`,
        },
        body: { query: "{ products { id title price } }" },
      }).then((productsRes) => {
        const products = productsRes.body?.data?.products as
          | { id: string; title: string; price: number }[]
          | undefined;
        expect(products, "products").to.be.an("array").and.not.be.empty;
        const p = products!.find((x) => x.id === "aptekarka") ?? products![0]!;

        const itemsQuantity = 1;
        const itemsPrice = Number(p.price) * itemsQuantity;
        const shippingPrice = itemsPrice < 200 ? 20 : 0;
        const totalPrice = itemsPrice + shippingPrice;

        const PLACE_ORDER = `
          mutation PlaceOrder($input: PlaceOrderInput!) {
            placeOrder(input: $input) { id }
          }
        `;

        return cy
          .request({
            method: "POST",
            url: GRAPHQL_URL,
            headers: {
              "Content-Type": "application/json",
              "X-App-Locale": "pl",
              Authorization: `Bearer ${token}`,
            },
            body: {
              query: PLACE_ORDER,
              variables: {
                input: {
                  items: [
                    {
                      productId: p.id,
                      title: p.title,
                      quantity: 1,
                      price: p.price,
                    },
                  ],
                  shippingAddress: {
                    name: "Test User",
                    addressLine1: "Test Street 1",
                    addressLine2: "",
                    postalCode: "00-000",
                    city: "Warsaw",
                    country: "Poland",
                  },
                  paymentMethod: "stripe",
                  stripePaymentIntentId: "pi_test_123",
                  itemsQuantity,
                  itemsPrice,
                  shippingPrice,
                  totalPrice,
                },
              },
            },
          })
          .then((placeRes) => {
            const orderId = placeRes.body?.data?.placeOrder?.id as
              | string
              | undefined;
            expect(orderId, "order id").to.be.a("string").and.not.be.empty;

            // Navigate in-app: auth is already in localStorage from loginByApi().
            cy.visit(`order/${orderId}`);
            cy.location("pathname").should("eq", `/pl/order/${orderId}`);
            cy.contains(`Numer zamówienia: ${orderId}`).should("be.visible");
          });
      });
    });
  });
});

