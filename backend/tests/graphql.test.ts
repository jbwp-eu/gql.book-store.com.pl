import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import PRODUCTS from "../products.js";

describe("GraphQL HTTP", () => {
  let app: (typeof import("../app.js"))["app"];
  let dbReady: (typeof import("../db.js"))["dbReady"];

  beforeAll(async () => {
    // Ensure each test run uses a clean, isolated SQLite database.
    // This prevents state leakage between runs and avoids collisions when registering users.
    const dbPath = path.join(
      os.tmpdir(),
      `gql-book-store-test-${process.pid}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.db`
    );
    process.env.DB_PATH = dbPath;
    process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
    process.env.STORE_ADDRESS =
      process.env.STORE_ADDRESS ?? "Test Book Store, Warsaw, Poland";
    try {
      fs.rmSync(dbPath, { force: true });
    } catch {
      // ignore
    }

    // Import after DB_PATH is set, so db.ts initializes against the per-run database.
    ({ app } = await import("../app.js"));
    ({ dbReady } = await import("../db.js"));
    await dbReady;
  });

  function uniqueEmail(prefix = "user"): string {
    return `${prefix}.${process.pid}.${Date.now()}.${Math.random()
      .toString(16)
      .slice(2)}@test.pl`;
  }

  it("returns hello from the schema", async () => {
    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({ query: "{ hello }" });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.hello).toBe("Hello from GraphQL (ESM)");
  });

  it("returns currency from CURRENCY env (uppercased)", async () => {
    const prev = process.env.CURRENCY;
    process.env.CURRENCY = "eur";
    try {
      const res = await request(app)
        .post("/graphql")
        .set("Content-Type", "application/json")
        .send({ query: "{ currency }" });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.currency).toBe("EUR");
    } finally {
      if (prev === undefined) {
        delete process.env.CURRENCY;
      } else {
        process.env.CURRENCY = prev;
      }
    }
  });

  it("returns products matching catalog entries when present in DB", async () => {
    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `{ products { id title } }`,
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const products = res.body.data?.products as
      | { id: string; title: string }[]
      | undefined;
    expect(Array.isArray(products)).toBe(true);
    expect(products!.length).toBeGreaterThan(0);
    const byId = new Map(products!.map((p) => [p.id, p]));
    const catalogHit = PRODUCTS.find((p) => byId.has(p.id));
    expect(catalogHit).toBeDefined();
    expect(byId.get(catalogHit!.id)?.title).toBe(catalogHit!.title);
  });

  it("returns a single product by id when present in DB", async () => {
    const listRes = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `{ products { id } }`,
      });
    expect(listRes.status).toBe(200);
    const rows = listRes.body.data?.products as { id: string }[] | undefined;
    expect(Array.isArray(rows)).toBe(true);
    const catalogHit = PRODUCTS.find((p) =>
      rows!.some((r) => r.id === p.id)
    );
    expect(catalogHit).toBeDefined();

    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `query ($id: ID!) { product(id: $id) { id title price } }`,
        variables: { id: catalogHit!.id },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const product = res.body.data?.product as
      | { id: string; title: string; price: number }
      | null
      | undefined;
    expect(product).toBeTruthy();
    expect(product!.id).toBe(catalogHit!.id);
    expect(product!.title).toBe(catalogHit!.title);
    expect(typeof product!.price).toBe("number");
  });

  it("returns searchProducts matching title substring when catalog rows exist", async () => {
    const listRes = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `{ products { id title } }`,
      });
    expect(listRes.status).toBe(200);
    const rows = listRes.body.data?.products as
      | { id: string; title: string }[]
      | undefined;
    const catalogHit = PRODUCTS.find((p) =>
      rows!.some((r) => r.id === p.id)
    );
    expect(catalogHit).toBeDefined();
    const needle =
      catalogHit!.title.length >= 4
        ? catalogHit!.title.slice(0, 4)
        : catalogHit!.title;

    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `query ($q: String!) { searchProducts(query: $q) { id title } }`,
        variables: { q: needle },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const found = res.body.data?.searchProducts as
      | { id: string; title: string }[]
      | undefined;
    expect(Array.isArray(found)).toBe(true);
    expect(found!.some((p) => p.id === catalogHit!.id)).toBe(true);
  });

  it("returns productReviews for product ids", async () => {
    const listRes = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `{ products { id } }`,
      });
    expect(listRes.status).toBe(200);
    const rows = listRes.body.data?.products as { id: string }[] | undefined;
    expect(Array.isArray(rows)).toBe(true);
    expect(rows!.length).toBeGreaterThan(0);

    for (const { id: productId } of rows!) {
      const res = await request(app)
        .post("/graphql")
        .set("Content-Type", "application/json")
        .send({
          query: `query ($productId: ID!) {
            productReviews(productId: $productId) {
              id
              rating
              comment
              user { id name }
            }
          }`,
          variables: { productId },
        });

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      const reviews = res.body.data?.productReviews as
        | {
            id: string;
            rating: number;
            comment: string;
            user: { id: string; name: string };
          }[]
        | undefined;
      expect(Array.isArray(reviews)).toBe(true);
      for (const r of reviews ?? []) {
        expect(typeof r.id).toBe("string");
        expect(typeof r.rating).toBe("number");
        expect(typeof r.comment).toBe("string");
        expect(r.user).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
        });
      }
    }
  });

  it("returns AuthPayload from login with seeded admin credentials", async () => {
    const password = process.env.ADMIN_PASSWORD ?? "admin";
    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
            user {
              id
              name
              email
              isAdmin
            }
          }
        }`,
        variables: { email: "admin@test.pl", password },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const login = res.body.data?.login as
      | {
          token: string;
          user: {
            id: string;
            name: string;
            email: string;
            isAdmin: boolean;
          };
        }
      | undefined;
    expect(typeof login?.token).toBe("string");
    expect(login!.token.length).toBeGreaterThan(0);
    expect(login!.user.email).toBe("admin@test.pl");
    expect(login!.user.isAdmin).toBe(true);
  });

  it("returns GraphQL errors for register when email is already registered", async () => {
    const email = uniqueEmail("dup");
    const password = "password1";

    const firstRes = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
          }
        }`,
        variables: {
          input: { name: "User", email, password },
        },
      });

    expect(firstRes.status).toBe(200);
    expect(firstRes.body.errors).toBeUndefined();
    expect(typeof firstRes.body.data?.register?.token).toBe("string");

    const secondRes = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
          }
        }`,
        variables: {
          input: { name: "User", email, password },
        },
      });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data?.register ?? null).toBeNull();
    expect(secondRes.body.errors).toBeDefined();
    const errors = secondRes.body.errors as { message: string }[] | undefined;
    expect(Array.isArray(errors)).toBe(true);
    expect(errors!.length).toBeGreaterThan(0);
    expect(errors![0].message).toBe("Email already registered");
  });

  it("returns GraphQL errors for login with invalid email format", async () => {
    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
          }
        }`,
        variables: { email: "not-an-email", password: "whatever1" },
      });

    expect(res.status).toBe(200);
    expect(res.body.data?.login).toBeNull();
    expect(res.body.errors).toBeDefined();
    const errors = res.body.errors as { message: string }[] | undefined;
    expect(Array.isArray(errors)).toBe(true);
    expect(errors!.length).toBeGreaterThan(0);
    expect(errors![0].message).toBe("A valid email is required.");
  });

  it("returns GraphQL errors for login with invalid credentials", async () => {
    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
          }
        }`,
        variables: { email: "admin@test.pl", password: "wrongpass" },
      });

    expect(res.status).toBe(200);
    expect(res.body.data?.login).toBeNull();
    expect(res.body.errors).toBeDefined();
    const errors = res.body.errors as { message: string }[] | undefined;
    expect(Array.isArray(errors)).toBe(true);
    expect(errors!.length).toBeGreaterThan(0);
    expect(errors![0].message).toBe("Invalid email or password");
  });

  it("returns GraphQL errors for createStripePaymentIntent when Stripe is not configured", async () => {
    const prevKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const password = process.env.ADMIN_PASSWORD ?? "admin";
      const loginRes = await request(app)
        .post("/graphql")
        .set("Content-Type", "application/json")
        .send({
          query: `mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              token
            }
          }`,
          variables: { email: "admin@test.pl", password },
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.errors).toBeUndefined();
      const token = loginRes.body.data?.login?.token as string | undefined;
      expect(token).toBeTruthy();

      const productsRes = await request(app)
        .post("/graphql")
        .set("Content-Type", "application/json")
        .send({ query: `{ products { id price } }` });

      expect(productsRes.status).toBe(200);
      expect(productsRes.body.errors).toBeUndefined();
      const rows = productsRes.body.data?.products as
        | { id: string; price: number }[]
        | undefined;
      expect(Array.isArray(rows)).toBe(true);
      expect(rows!.length).toBeGreaterThan(0);
      const first = rows![0]!;
      expect(typeof first.id).toBe("string");
      expect(typeof first.price).toBe("number");

      const itemsQuantity = 1;
      const itemsPrice = first.price * itemsQuantity;
      const shippingPrice = itemsPrice < 200 ? 20 : 0;
      const totalPrice = itemsPrice + shippingPrice;

      const res = await request(app)
        .post("/graphql")
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${token}`)
        .send({
          query: `mutation CreatePI($input: CreateStripePaymentIntentInput!) {
            createStripePaymentIntent(input: $input) {
              clientSecret
              paymentIntentId
            }
          }`,
          variables: {
            input: {
              items: [
                {
                  productId: first.id,
                  title: "ignored",
                  quantity: itemsQuantity,
                  price: 0,
                },
              ],
              itemsQuantity,
              itemsPrice,
              shippingPrice,
              totalPrice,
            },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data?.createStripePaymentIntent ?? null).toBeNull();
      expect(res.body.errors).toBeDefined();
      const errors = res.body.errors as { message: string }[] | undefined;
      expect(Array.isArray(errors)).toBe(true);
      expect(errors!.length).toBeGreaterThan(0);
      expect(errors![0].message).toBe("Stripe is not configured on the server.");
    } finally {
      if (prevKey === undefined) {
        delete process.env.STRIPE_SECRET_KEY;
      } else {
        process.env.STRIPE_SECRET_KEY = prevKey;
      }
    }
  });

  it("returns GraphQL errors for deleteProduct without authorization", async () => {
    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation { deleteProduct(id: "aptekarka") }`,
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeDefined();
    const errors = res.body.errors as { message: string }[] | undefined;
    expect(Array.isArray(errors)).toBe(true);
    expect(errors!.length).toBeGreaterThan(0);
    expect(errors![0].message).toBe("Unauthorized");
  });

  it("returns GraphQL errors for myReviews without authorization", async () => {
    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `{ myReviews { id rating comment } }`,
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeDefined();
    const errors = res.body.errors as { message: string }[] | undefined;
    expect(Array.isArray(errors)).toBe(true);
    expect(errors!.length).toBeGreaterThan(0);
    expect(errors![0].message).toBe("Unauthorized");
  });

  it("returns GraphQL errors for searchUsers when caller is not admin", async () => {
    const unique = Date.now();
    const email = `user${unique}@test.pl`;
    const password = "password1";

    const registerRes = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
          }
        }`,
        variables: { input: { name: "User", email, password } },
      });

    expect(registerRes.status).toBe(200);
    expect(registerRes.body.errors).toBeUndefined();
    const token = registerRes.body.data?.register?.token as string | undefined;
    expect(token).toBeTruthy();

    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        query: `query SearchUsers($q: String!) { searchUsers(query: $q) { id email } }`,
        variables: { q: "a" },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeDefined();
    const errors = res.body.errors as { message: string }[] | undefined;
    expect(Array.isArray(errors)).toBe(true);
    expect(errors!.length).toBeGreaterThan(0);
    expect(errors![0].message).toBe("Forbidden");
  });

  it("returns adminOverview for admin Bearer token", async () => {
    const password = process.env.ADMIN_PASSWORD ?? "admin";
    const loginRes = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
          }
        }`,
        variables: { email: "admin@test.pl", password },
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.errors).toBeUndefined();
    const token = loginRes.body.data?.login?.token as string | undefined;
    expect(token).toBeTruthy();

    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        query: `query AdminOverview {
          adminOverview {
            productsCount
            usersCount
            ordersCount
            reviewsCount
            totalSales
          }
        }`,
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const overview = res.body.data?.adminOverview as
      | {
          productsCount: number;
          usersCount: number;
          ordersCount: number;
          reviewsCount: number;
          totalSales: number;
        }
      | undefined;
    expect(overview).toBeDefined();
    expect(typeof overview!.productsCount).toBe("number");
    expect(overview!.productsCount).toBeGreaterThanOrEqual(0);
    expect(typeof overview!.usersCount).toBe("number");
    expect(overview!.usersCount).toBeGreaterThanOrEqual(1);
    expect(typeof overview!.ordersCount).toBe("number");
    expect(typeof overview!.reviewsCount).toBe("number");
    expect(typeof overview!.totalSales).toBe("number");
  });

  it("returns GraphQL errors for chatMessages when order does not exist", async () => {
    const password = process.env.ADMIN_PASSWORD ?? "admin";
    const loginRes = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
          }
        }`,
        variables: { email: "admin@test.pl", password },
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.errors).toBeUndefined();
    const token = loginRes.body.data?.login?.token as string | undefined;
    expect(token).toBeTruthy();

    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        query: `query ChatMessages($orderId: ID!) {
          chatMessages(orderId: $orderId) {
            id
            content
            createdAt
          }
        }`,
        variables: { orderId: "does-not-exist" },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeDefined();
    const errors = res.body.errors as { message: string }[] | undefined;
    expect(Array.isArray(errors)).toBe(true);
    expect(errors!.length).toBeGreaterThan(0);
    expect(errors![0].message).toBe("Order not found");
  });

  it("returns GraphQL errors for sendContactMessage with invalid email", async () => {
    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation SendContact($input: ContactMessageInput!) {
          sendContactMessage(input: $input) {
            success
            error
          }
        }`,
        variables: {
          input: { email: "not-valid", message: "Hello there" },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeDefined();
    const errors = res.body.errors as { message: string }[] | undefined;
    expect(Array.isArray(errors)).toBe(true);
    expect(errors!.length).toBeGreaterThan(0);
    expect(errors![0].message).toBe("A valid email is required.");
  });

  it("returns myOrders for authenticated user Bearer token", async () => {
    const password = process.env.ADMIN_PASSWORD ?? "admin";
    const loginRes = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
          }
        }`,
        variables: { email: "admin@test.pl", password },
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.errors).toBeUndefined();
    const token = loginRes.body.data?.login?.token as string | undefined;
    expect(token).toBeTruthy();

    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        query: `{ myOrders { id totalPrice } }`,
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const orders = res.body.data?.myOrders as
      | { id: string; totalPrice: number }[]
      | undefined;
    expect(Array.isArray(orders)).toBe(true);
    for (const o of orders ?? []) {
      expect(typeof o.id).toBe("string");
      expect(typeof o.totalPrice).toBe("number");
    }
  });

  it("returns GraphQL errors for order(id) when user is not owner nor admin", async () => {
    // Register a non-admin user we can authenticate as.
    const unique = Date.now();
    const email = `user${unique}@test.pl`;
    const password = "password1";

    const registerRes = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
            user { id }
          }
        }`,
        variables: { input: { name: "User", email, password } },
      });

    expect(registerRes.status).toBe(200);
    expect(registerRes.body.errors).toBeUndefined();
    const userToken = registerRes.body.data?.register?.token as string | undefined;
    expect(userToken).toBeTruthy();

    // As admin, fetch any existing order id.
    const adminPassword = process.env.ADMIN_PASSWORD ?? "admin";
    const adminLoginRes = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) { token }
        }`,
        variables: { email: "admin@test.pl", password: adminPassword },
      });

    expect(adminLoginRes.status).toBe(200);
    expect(adminLoginRes.body.errors).toBeUndefined();
    const adminToken = adminLoginRes.body.data?.login?.token as
      | string
      | undefined;
    expect(adminToken).toBeTruthy();

    const ordersRes = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ query: `{ orders { id } }` });

    expect(ordersRes.status).toBe(200);
    expect(ordersRes.body.errors).toBeUndefined();
    const orders = ordersRes.body.data?.orders as { id: string }[] | undefined;
    expect(Array.isArray(orders)).toBe(true);
    expect(orders!.length).toBeGreaterThan(0);
    const orderId = orders![0]!.id;

    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: `query Order($id: ID!) { order(id: $id) { id totalPrice } }`,
        variables: { id: orderId },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeDefined();
    const errors = res.body.errors as { message: string }[] | undefined;
    expect(Array.isArray(errors)).toBe(true);
    expect(errors!.length).toBeGreaterThan(0);
    expect(errors![0].message).toBe("Forbidden");
  });

  it("returns storeLocation with name and numeric coordinates", async () => {
    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `{ storeLocation { name latitude longitude } }`,
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const loc = res.body.data?.storeLocation as
      | { name: string; latitude: number; longitude: number }
      | undefined;
    expect(loc).toBeDefined();
    expect(typeof loc!.name).toBe("string");
    expect(loc!.name.length).toBeGreaterThan(0);
    expect(typeof loc!.latitude).toBe("number");
    expect(typeof loc!.longitude).toBe("number");
    expect(Number.isFinite(loc!.latitude)).toBe(true);
    expect(Number.isFinite(loc!.longitude)).toBe(true);
  });
});
