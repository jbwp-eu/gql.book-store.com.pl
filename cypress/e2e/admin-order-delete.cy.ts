describe("admin actions: order delete", () => {
  const GRAPHQL_URL = "http://localhost:4000/graphql";

  function visitHomeWithCleanStorage() {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  }

  function loginAndHydrateAuth(): Cypress.Chainable<string> {
    return cy.loginByApi().then((token) => cy.reload().then(() => token));
  }

  function createOrderByApi(token: string) {
    const PRODUCTS_QUERY = `{ products { id title price } }`;
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
        body: { query: PRODUCTS_QUERY },
      })
      .then((productsRes) => {
        const products = productsRes.body?.data?.products as
          | { id: string; title: string; price: number }[]
          | undefined;
        expect(products, "products").to.be.an("array").and.not.be.empty;

        const p = products!.find((x) => x.id === "cienwiatru") ?? products![0]!;
        const itemsQuantity = 1;
        const itemsPrice = Number(p.price) * itemsQuantity;
        const shippingPrice = itemsPrice < 200 ? 20 : 0;
        const totalPrice = itemsPrice + shippingPrice;

        return cy.request({
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
                stripePaymentIntentId: "pi_test_admin_delete",
                itemsQuantity,
                itemsPrice,
                shippingPrice,
                totalPrice,
              },
            },
          },
        });
      })
      .then((placeRes) => {
        expect(placeRes.body?.errors, "placeOrder errors").to.not.exist;
        const orderId = placeRes.body?.data?.placeOrder?.id as string | undefined;
        expect(orderId, "order id").to.be.a("string").and.not.be.empty;
        return cy.wrap(orderId);
      });
  }

  it("can delete an order created during the test from admin orders list", () => {
    visitHomeWithCleanStorage();

    loginAndHydrateAuth().then((token) => {
      createOrderByApi(token).then((orderId) => {
        const tail = String(orderId).slice(-6);
        const displayId = `...${tail}`;

        cy.visit("admin/orders");
        cy.location("pathname").should("eq", "/pl/admin/orders");
        cy.get("h1").should("contain.text", "Zamówienia");

        cy.contains("tr", displayId)
          .should("be.visible")
          .within(() => {
            cy.contains("button", "Usuń").click();
          });

        cy.contains("h2", "Usuń zamówienie").should("be.visible");
        cy.get('[role="dialog"]').within(() => {
          cy.contains("button", "Usuń").should("be.visible").click();
        });

        cy.contains(displayId).should("not.exist");
      });
    });
  });
});

