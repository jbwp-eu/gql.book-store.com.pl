import { GraphQLError } from "graphql";
import type { OrderItem } from "../models/order.js";
import type { TranslateFn } from "../i18n/t.js";

/** Keep in sync with `frontend/src/utils/shipping.ts`. */
export const FREE_SHIPPING_THRESHOLD_PLN = 200;
export const SHIPPING_COST_PLN = 20;

const TOTALS_EPSILON = 0.01;

export function computeShippingCost(itemsSubtotal: number): number {
  return itemsSubtotal < FREE_SHIPPING_THRESHOLD_PLN ? SHIPPING_COST_PLN : 0;
}

export function computeOrderTotalsFromItems(items: OrderItem[]): {
  itemsQuantity: number;
  itemsPrice: number;
  shippingPrice: number;
  totalPrice: number;
} {
  const itemsQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shippingPrice = computeShippingCost(itemsPrice);
  const totalPrice = itemsPrice + shippingPrice;
  return { itemsQuantity, itemsPrice, shippingPrice, totalPrice };
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < TOTALS_EPSILON;
}

export function assertClientOrderTotalsMatch(
  client: {
    itemsQuantity: number;
    itemsPrice: number;
    shippingPrice: number;
    totalPrice: number;
  },
  server: {
    itemsQuantity: number;
    itemsPrice: number;
    shippingPrice: number;
    totalPrice: number;
  },
  t: TranslateFn
): void {
  if (client.itemsQuantity !== server.itemsQuantity) {
    throw new GraphQLError(t("orderTotalsMismatchItemsQuantity"));
  }
  if (!near(client.itemsPrice, server.itemsPrice)) {
    throw new GraphQLError(t("orderTotalsMismatchItemsPrice"));
  }
  if (!near(client.shippingPrice, server.shippingPrice)) {
    throw new GraphQLError(t("orderTotalsMismatchShippingPrice"));
  }
  if (!near(client.totalPrice, server.totalPrice)) {
    throw new GraphQLError(t("orderTotalsMismatchTotalPrice"));
  }
}
