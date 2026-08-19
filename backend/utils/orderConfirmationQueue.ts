import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { Order } from "../models/order.js";
import { logger } from "./logger.js";

export type OrderConfirmationMessage = {
  orderId: string;
  userEmail: string;
  userName: string;
  totalPrice: number;
  currency: string;
  paidAt: string;
  items: Array<{ title: string; quantity: number; price: number }>;
  shippingAddress: {
    name: string;
    addressLine1: string;
    addressLine2?: string | null;
    postalCode: string;
    city: string;
    country: string;
  };
  language: "pl" | "en";
};

let sqsClient: SQSClient | null = null;

function getQueueUrl(): string | null {
  const url = process.env.ORDER_CONFIRMATION_QUEUE_URL?.trim();
  return url && url.length > 0 ? url : null;
}

function getSqsClient(): SQSClient {
  if (!sqsClient) {
    const region = process.env.AWS_REGION?.trim() || "eu-central-1";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
    // Explicit keys for OVH / local; on EC2 omit them and use the instance role.
    sqsClient = new SQSClient(
      accessKeyId && secretAccessKey
        ? {
            region,
            credentials: { accessKeyId, secretAccessKey },
          }
        : { region }
    );
  }
  return sqsClient;
}

export type OrderEmailLanguage = "pl" | "en";

export function orderToConfirmationMessage(
  order: Order,
  language: OrderEmailLanguage = "pl"
): OrderConfirmationMessage | null {
  const userEmail = order.user.email?.trim();
  if (!userEmail) {
    return null;
  }

  const currency = process.env.CURRENCY?.trim() || "PLN";
  const paidAt = order.paidAt ?? new Date().toISOString();

  return {
    orderId: order.id,
    userEmail,
    userName: order.user.name,
    totalPrice: order.totalPrice,
    currency,
    paidAt,
    items: order.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      price: item.price,
    })),
    shippingAddress: {
      name: order.shippingAddress.name,
      addressLine1: order.shippingAddress.addressLine1,
      addressLine2: order.shippingAddress.addressLine2,
      postalCode: order.shippingAddress.postalCode,
      city: order.shippingAddress.city,
      country: order.shippingAddress.country,
    },
    language: language === "en" ? "en" : "pl",
  };
}

export async function enqueueOrderConfirmationEmail(
  order: Order,
  language: "pl" | "en" = "pl"
): Promise<void> {
  const queueUrl = getQueueUrl();
  if (!queueUrl) {
    return;
  }

  const message = orderToConfirmationMessage(order, language);
  if (!message) {
    logger.warn("order confirmation email skipped: no customer email", {
      orderId: order.id,
    });
    return;
  }

  try {
    await getSqsClient().send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message),
      })
    );
    logger.info("order confirmation email enqueued", { orderId: order.id });
  } catch (err) {
    logger.error("failed to enqueue order confirmation email", err, {
      orderId: order.id,
    });
  }
}
