import type Stripe from "stripe";
import {
  cancelUnpaidOrderByStripePaymentIntentId,
  setOrderPaidByStripePaymentIntentId,
} from "../models/order.js";

function paymentIntentIdFromCharge(charge: Stripe.Charge): string | null {
  const pi = charge.payment_intent;
  if (typeof pi === "string") return pi;
  return pi?.id ?? null;
}

/** Apply a verified Stripe webhook event (idempotency handled by caller). */
export function applyStripeWebhookEvent(event: Stripe.Event): void {
  switch (event.type) {
    case "charge.succeeded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = paymentIntentIdFromCharge(charge);
      if (paymentIntentId) {
        setOrderPaidByStripePaymentIntentId(paymentIntentId);
      }
      break;
    }
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.id) {
        setOrderPaidByStripePaymentIntentId(pi.id);
      }
      break;
    }
    case "payment_intent.payment_failed":
    case "payment_intent.canceled": {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.id) {
        cancelUnpaidOrderByStripePaymentIntentId(pi.id);
      }
      break;
    }
    default:
      break;
  }
}
