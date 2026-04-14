import type { AddressInfo } from "node:net";
import http from "node:http";
import Stripe from "stripe";
import type { Express } from "express";
import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeT } from "../i18n/t.js";

/** Preserves exact bytes for Stripe signature verification (supertest may reserialize JSON). */
function postStripeWebhook(
  app: Express,
  rawBody: string,
  stripeSignature: string
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      try {
        const addr = server.address() as AddressInfo;
        const port = addr.port;
        const buf = Buffer.from(rawBody, "utf8");
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port,
            path: "/webhooks/stripe",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": String(buf.length),
              "stripe-signature": stripeSignature,
            },
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => {
              server.close();
              resolve({
                status: res.statusCode ?? 0,
                text: Buffer.concat(chunks).toString("utf8"),
              });
            });
          }
        );
        req.on("error", (e) => {
          server.close();
          reject(e);
        });
        req.write(buf);
        req.end();
      } catch (e) {
        server.close();
        reject(e);
      }
    });
  });
}

describe("Stripe webhooks HTTP", () => {
  let app: (typeof import("../app.js"))["app"];
  let dbReady: (typeof import("../db.js"))["dbReady"];
  let db: (typeof import("../db.js"))["db"];
  let createOrder: (typeof import("../models/order.js"))["createOrder"];
  let findProductById: (typeof import("../models/product.js"))["findProductById"];

  beforeAll(async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `gql-book-store-stripe-${process.pid}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.db`
    );
    process.env.DB_PATH = dbPath;
    process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
    process.env.STRIPE_SECRET_KEY = "sk_test_webhook";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_webhook_secret";
    try {
      fs.rmSync(dbPath, { force: true });
    } catch {
      // ignore
    }

    ({ app } = await import("../app.js"));
    ({ dbReady, db } = await import("../db.js"));
    await dbReady;
    ({ createOrder } = await import("../models/order.js"));
    ({ findProductById } = await import("../models/product.js"));
  });

  function signStripeBody(body: object): { raw: string; header: string } {
    const raw = JSON.stringify(body);
    const header = Stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });
    return { raw, header };
  }

  it("returns 200 and skips processing when Stripe event id was already processed", async () => {
    const body = {
      id: "evt_duplicate_1",
      object: "event",
      type: "charge.succeeded",
      data: {
        object: {
          id: "ch_1",
          object: "charge",
          payment_intent: "pi_no_such_order",
        },
      },
    };
    const { raw, header } = signStripeBody(body);

    const res1 = await postStripeWebhook(app, raw, header);
    expect(res1.status).toBe(200);

    const res2 = await postStripeWebhook(app, raw, header);
    expect(res2.status).toBe(200);

    const count = db
      .prepare(
        "SELECT COUNT(*) as c FROM stripe_webhook_events WHERE id = ?"
      )
      .get("evt_duplicate_1") as { c: number };
    expect(count.c).toBe(1);
  });

  it("cancels unpaid order and restores stock on payment_intent.payment_failed", async () => {
    const t = makeT("pl");
    const product = findProductById("aptekarka");
    expect(product).toBeTruthy();

    const beforeStock = product!.countInStock;
    const piId = `pi_fail_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const order = createOrder({
      userId: "1",
      items: [
        {
          productId: "aptekarka",
          title: "Aptekarka",
          quantity: 1,
          price: 49.99,
        },
      ],
      shippingAddress: {
        name: "Test User",
        addressLine1: "Street 1",
        postalCode: "00-001",
        city: "Warsaw",
        country: "PL",
      },
      paymentMethod: "stripe",
      stripePaymentIntentId: piId,
      paypalCaptureId: null,
      totalPrice: 69.99,
      t,
    });

    const afterCreate = findProductById("aptekarka")!.countInStock;
    expect(afterCreate).toBe(beforeStock - 1);

    const body = {
      id: `evt_fail_${piId}`,
      object: "event",
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: piId,
          object: "payment_intent",
        },
      },
    };
    const { raw, header } = signStripeBody(body);

    const res = await postStripeWebhook(app, raw, header);
    expect(res.status).toBe(200);

    const row = db
      .prepare("SELECT id FROM orders WHERE id = ?")
      .get(order.id) as { id: string } | undefined;
    expect(row).toBeUndefined();

    const restored = findProductById("aptekarka")!.countInStock;
    expect(restored).toBe(beforeStock);
  });

  it("marks order paid on payment_intent.succeeded", async () => {
    const t = makeT("pl");
    const piId = `pi_ok_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    // Use same catalog line as other tests in this file so stock stays consistent
    // when this suite shares a Node module cache / DB with other backend tests.
    const order = createOrder({
      userId: "1",
      items: [
        {
          productId: "aptekarka",
          title: "Aptekarka",
          quantity: 1,
          price: 49.99,
        },
      ],
      shippingAddress: {
        name: "Pay Test",
        addressLine1: "Street 2",
        postalCode: "00-002",
        city: "Krakow",
        country: "PL",
      },
      paymentMethod: "stripe",
      stripePaymentIntentId: piId,
      paypalCaptureId: null,
      totalPrice: 69.99,
      t,
    });

    expect(order.isPaid).toBe(false);

    const body = {
      id: `evt_pi_ok_${piId}`,
      object: "event",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: piId,
          object: "payment_intent",
        },
      },
    };
    const { raw, header } = signStripeBody(body);

    const res = await postStripeWebhook(app, raw, header);
    expect(res.status).toBe(200);

    const paid = db
      .prepare("SELECT is_paid FROM orders WHERE id = ?")
      .get(order.id) as { is_paid: number };
    expect(paid.is_paid).toBe(1);
  });
});
