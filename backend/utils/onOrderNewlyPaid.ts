import type { Order, SetOrderPaidResult } from "../models/order.js";
import { enqueueOrderConfirmationEmail } from "./orderConfirmationQueue.js";

export function onOrderNewlyPaid(
  order: Order | null | undefined,
  language: "pl" | "en" = "pl"
): void {
  if (!order?.isPaid) {
    return;
  }
  void enqueueOrderConfirmationEmail(order, language);
}

export function onStripeOrderNewlyPaid(
  result: SetOrderPaidResult,
  language: "pl" | "en" = "pl"
): void {
  if (!result.newlyPaid || !result.order) {
    return;
  }
  onOrderNewlyPaid(result.order, language);
}
