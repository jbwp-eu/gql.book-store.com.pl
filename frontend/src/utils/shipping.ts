import type { CartItem } from "../store/cartSlice";

/** Keep in sync with `backend/utils/shipping.ts`. */
export const FREE_SHIPPING_THRESHOLD_PLN = 200;
export const SHIPPING_COST_PLN = 20;

export type CartOrderTotals = {
  itemsQuantity: number;
  itemsPrice: number;
  shippingPrice: number;
  totalPrice: number;
};

export function computeShippingCost(itemsSubtotal: number): number {
  return itemsSubtotal < FREE_SHIPPING_THRESHOLD_PLN ? SHIPPING_COST_PLN : 0;
}

export function computeCartTotals(items: CartItem[]): CartOrderTotals {
  const itemsQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsPrice = items.reduce(
    (sum, item) => sum + (item.price ?? 0) * item.quantity,
    0
  );
  const shippingPrice = computeShippingCost(itemsPrice);
  const totalPrice = itemsPrice + shippingPrice;
  return { itemsQuantity, itemsPrice, shippingPrice, totalPrice };
}
