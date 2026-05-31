import type { Order, SetOrderPaidResult } from "../models/order.js";
import { enqueueOrderConfirmationEmail } from "./orderConfirmationQueue.js";

export function onOrderNewlyPaid(order: Order | null | undefined): void {
  if (!order?.isPaid) {
    return;
  }
  void enqueueOrderConfirmationEmail(order);
}

export function onStripeOrderNewlyPaid(result: SetOrderPaidResult): void {
  if (!result.newlyPaid || !result.order) {
    return;
  }
  onOrderNewlyPaid(result.order);
}
