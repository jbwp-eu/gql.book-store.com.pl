import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Order } from "../models/order.js";

const send = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-sqs", () => ({
  SQSClient: vi.fn(() => ({ send })),
  SendMessageCommand: vi.fn((input: unknown) => input),
}));

describe("orderConfirmationQueue", () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({});
    delete process.env.ORDER_CONFIRMATION_QUEUE_URL;
    delete process.env.AWS_REGION;
    delete process.env.CURRENCY;
  });

  const sampleOrder: Order = {
    id: "order-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    totalPrice: 99.5,
    items: [
      {
        productId: "p1",
        title: "Book",
        quantity: 2,
        price: 49.75,
      },
    ],
    shippingAddress: {
      name: "Jan",
      addressLine1: "ul. Test 1",
      addressLine2: null,
      postalCode: "00-001",
      city: "Warsaw",
      country: "PL",
    },
    paymentMethod: "stripe",
    stripePaymentIntentId: "pi_123",
    paypalCaptureId: null,
    isPaid: true,
    paidAt: "2026-01-01T01:00:00.000Z",
    isDelivered: false,
    deliveredAt: null,
    user: {
      id: "u1",
      name: "Jan Kowalski",
      email: "jan@example.com",
      isAdmin: false,
    },
  };

  it("does not call SQS when ORDER_CONFIRMATION_QUEUE_URL is unset", async () => {
    const { enqueueOrderConfirmationEmail } = await import(
      "../utils/orderConfirmationQueue.js"
    );
    await enqueueOrderConfirmationEmail(sampleOrder);
    expect(send).not.toHaveBeenCalled();
  });

  it("sends message with expected shape when queue URL is set", async () => {
    process.env.ORDER_CONFIRMATION_QUEUE_URL =
      "https://sqs.eu-central-1.amazonaws.com/123/gql-book-store-order-confirmation";
    process.env.CURRENCY = "PLN";

    const { enqueueOrderConfirmationEmail } = await import(
      "../utils/orderConfirmationQueue.js"
    );
    await enqueueOrderConfirmationEmail(sampleOrder);

    expect(send).toHaveBeenCalledTimes(1);
    const input = send.mock.calls[0][0] as {
      QueueUrl: string;
      MessageBody: string;
    };
    expect(input.QueueUrl).toBe(process.env.ORDER_CONFIRMATION_QUEUE_URL);
    const body = JSON.parse(input.MessageBody);
    expect(body).toMatchObject({
      orderId: "order-1",
      userEmail: "jan@example.com",
      userName: "Jan Kowalski",
      totalPrice: 99.5,
      currency: "PLN",
      paidAt: "2026-01-01T01:00:00.000Z",
    });
    expect(body.items).toHaveLength(1);
    expect(body.shippingAddress.city).toBe("Warsaw");
  });
});
