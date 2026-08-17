import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeT } from "../i18n/t.js";

describe("setOrderPaidByStripePaymentIntentId", () => {
  let setOrderPaidByStripePaymentIntentId: (typeof import("../models/order.js"))["setOrderPaidByStripePaymentIntentId"];
  let createOrder: (typeof import("../models/order.js"))["createOrder"];
  let adminUserId: string;

  beforeAll(async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `gql-order-paid-${process.pid}-${Date.now()}.db`
    );
    process.env.DB_PATH = dbPath;
    process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
    try {
      fs.rmSync(dbPath, { force: true });
    } catch {
      // ignore
    }

    const { dbReady } = await import("../db.js");
    await dbReady;
    ({ setOrderPaidByStripePaymentIntentId, createOrder } = await import(
      "../models/order.js"
    ));
    const { findUserByEmail } = await import("../models/user.js");
    const admin = findUserByEmail("admin@test.pl");
    if (!admin) throw new Error("seeded admin missing");
    adminUserId = admin.id;
  });

  it("returns newlyPaid true only on first payment", () => {
    const t = makeT("en");
    const piId = `pi_newly_${Date.now()}`;

    const order = createOrder({
      userId: adminUserId,
      items: [
        {
          productId: "aptekarka",
          title: "Aptekarka",
          quantity: 1,
          price: 49.99,
        },
      ],
      shippingAddress: {
        name: "Test",
        addressLine1: "Line 1",
        postalCode: "00-001",
        city: "Warsaw",
        country: "PL",
      },
      paymentMethod: "stripe",
      stripePaymentIntentId: piId,
      totalPrice: 49.99,
      t,
    });

    expect(order.isPaid).toBe(false);

    const first = setOrderPaidByStripePaymentIntentId(piId);
    expect(first.newlyPaid).toBe(true);
    expect(first.order?.isPaid).toBe(true);

    const second = setOrderPaidByStripePaymentIntentId(piId);
    expect(second.newlyPaid).toBe(false);
    expect(second.order?.isPaid).toBe(true);
  });
});
