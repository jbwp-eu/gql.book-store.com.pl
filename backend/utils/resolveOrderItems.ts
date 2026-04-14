import { GraphQLError } from "graphql";
import { findProductById } from "../models/product.js";
import type { OrderItem } from "../models/order.js";
import type { TranslateFn } from "../i18n/t.js";

export function resolveOrderItemsFromDatabase(
  lines: Array<{ productId: string; quantity: number }>,
  t: TranslateFn
): OrderItem[] {
  return lines.map(({ productId, quantity }) => {
    const product = findProductById(productId);
    if (!product) {
      throw new GraphQLError(t("productNotFoundWithId", { productId }));
    }
    return {
      productId,
      title: product.title,
      quantity,
      price: product.price,
    };
  });
}
