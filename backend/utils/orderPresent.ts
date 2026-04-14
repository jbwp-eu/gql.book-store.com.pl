import type { Order } from "../models/order.js";
import { findProductById } from "../models/product.js";

/** Adds `image` for GraphQL from the current product's first image (not persisted on the order). */
export function withOrderItemImages(order: Order): Order {
  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      image: findProductById(item.productId)?.images?.[0] ?? null,
    })),
  };
}

export function withOrderItemImagesList(orders: Order[]): Order[] {
  return orders.map(withOrderItemImages);
}
