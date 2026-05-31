import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const enqueueOrderConfirmationEmail = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);

const capturePayPalOrder = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    captureId: "capture_test_123",
    captureStatus: "COMPLETED",
    orderStatus: "COMPLETED",
    amountCurrencyCode: "PLN",
    amountValue: "69.99",
  })
);

vi.mock("../utils/orderConfirmationQueue.js", () => ({
  enqueueOrderConfirmationEmail,
}));

vi.mock("../utils/paypal.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/paypal.js")>();
  return {
    ...actual,
    capturePayPalOrder,
  };
});

describe("placeOrder PayPal", () => {
  let app: (typeof import("../app.js"))["app"];
  let dbReady: (typeof import("../db.js"))["dbReady"];

  beforeAll(async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `gql-book-store-paypal-${process.pid}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.db`
    );
    process.env.DB_PATH = dbPath;
    process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
    process.env.CURRENCY = "PLN";
    try {
      fs.rmSync(dbPath, { force: true });
    } catch {
      // ignore
    }

    ({ app } = await import("../app.js"));
    ({ dbReady } = await import("../db.js"));
    await dbReady;
  });

  beforeEach(() => {
    enqueueOrderConfirmationEmail.mockClear();
    capturePayPalOrder.mockClear();
  });

  async function registerAndGetToken(): Promise<string> {
    const email = `paypal.${process.pid}.${Date.now()}.${Math.random()
      .toString(16)
      .slice(2)}@test.pl`;
    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .send({
        query: `mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
          }
        }`,
        variables: {
          input: { name: "PayPal User", email, password: "password1" },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const token = res.body.data?.register?.token as string | undefined;
    expect(token).toBeTruthy();
    return token!;
  }

  const placeOrderInput = {
    items: [
      {
        productId: "aptekarka",
        title: "ignored",
        quantity: 1,
        price: 0,
      },
    ],
    shippingAddress: {
      name: "PayPal User",
      addressLine1: "ul. Test 1",
      postalCode: "00-001",
      city: "Warsaw",
      country: "PL",
    },
    paymentMethod: "paypal",
    paypalOrderId: "PAYPAL_ORDER_123",
    itemsQuantity: 1,
    itemsPrice: 49.99,
    shippingPrice: 20,
    totalPrice: 69.99,
  };

  it("enqueues order confirmation email after successful PayPal capture", async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        query: `mutation PlaceOrder($input: PlaceOrderInput!) {
          placeOrder(input: $input) {
            id
            isPaid
            paymentMethod
            paypalCaptureId
          }
        }`,
        variables: { input: placeOrderInput },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const order = res.body.data?.placeOrder as
      | {
          id: string;
          isPaid: boolean;
          paymentMethod: string;
          paypalCaptureId: string;
        }
      | undefined;
    expect(order).toMatchObject({
      isPaid: true,
      paymentMethod: "paypal",
      paypalCaptureId: "capture_test_123",
    });

    expect(capturePayPalOrder).toHaveBeenCalledTimes(1);
    expect(capturePayPalOrder).toHaveBeenCalledWith("PAYPAL_ORDER_123");
    expect(enqueueOrderConfirmationEmail).toHaveBeenCalledTimes(1);
    const enqueuedOrder = enqueueOrderConfirmationEmail.mock.calls[0][0];
    expect(enqueuedOrder).toMatchObject({
      id: order!.id,
      isPaid: true,
      paymentMethod: "paypal",
      paypalCaptureId: "capture_test_123",
    });
    expect(enqueuedOrder.totalPrice).toBeCloseTo(69.99, 2);
    expect(enqueuedOrder.user.email).toContain("@test.pl");
  });

  it("does not enqueue order confirmation email for unpaid Stripe placeOrder", async () => {
    const token = await registerAndGetToken();
    const piId = `pi_unpaid_${Date.now()}`;

    const res = await request(app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        query: `mutation PlaceOrder($input: PlaceOrderInput!) {
          placeOrder(input: $input) {
            id
            isPaid
          }
        }`,
        variables: {
          input: {
            ...placeOrderInput,
            paymentMethod: "stripe",
            paypalOrderId: null,
            stripePaymentIntentId: piId,
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.placeOrder?.isPaid).toBe(false);
    expect(enqueueOrderConfirmationEmail).not.toHaveBeenCalled();
  });
});
