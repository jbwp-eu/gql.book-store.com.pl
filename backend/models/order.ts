import { db } from "../db.js";
import type { TranslateFn } from "../i18n/t.js";
import { logger } from "../utils/logger.js";
import { deleteChatMessagesByOrderId } from "./chat.js";
import {
  decrementStockForLines,
  incrementStockForLines,
} from "./product.js";
import { findUserById } from "./user.js";

export type OrderItem = {
  productId: string;
  title: string;
  quantity: number;
  price: number;
  /** Set when presenting orders via GraphQL; not stored in DB JSON. */
  image?: string | null;
};

export type OrderShippingAddress = {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  country: string;
};

export type Order = {
  id: string;
  createdAt: string;
  totalPrice: number;
  items: OrderItem[];
  shippingAddress: OrderShippingAddress;
  paymentMethod: string;
  stripePaymentIntentId?: string | null;
  paypalCaptureId?: string | null;
  isPaid: boolean;
  paidAt?: string | null;
  isDelivered: boolean;
  deliveredAt?: string | null;
  user: { id: string; name: string; email: string; isAdmin: boolean };
};

type OrderRow = {
  id: string;
  user_id: string;
  created_at: string;
  total_price: number;
  items: string | null;
  shipping_name: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  payment_method: string | null;
  stripe_payment_intent_id?: string | null;
  paypal_capture_id?: string | null;
  is_paid?: number | null;
  paid_at?: string | null;
  is_delivered?: number | null;
  delivered_at?: string | null;
};

function mapRowToOrder(row: OrderRow): Order {
  const user = findUserById(row.user_id);
  let parsedItems: OrderItem[] = [];
  if (row.items) {
    try {
      const raw = JSON.parse(row.items) as unknown;
      if (Array.isArray(raw)) {
        parsedItems = raw
          .map((item) => ({
            productId: String((item as { productId?: unknown }).productId ?? ""),
            title: String((item as { title?: unknown }).title ?? ""),
            quantity: Number((item as { quantity?: unknown }).quantity ?? 0),
            price: Number((item as { price?: unknown }).price ?? 0),
          }))
          .filter((item) => item.productId && item.quantity > 0);
      }
    } catch {
      parsedItems = [];
    }
  }
  

  return {
    id: row.id,
    createdAt: row.created_at,
    totalPrice: row.total_price,
    items: parsedItems,
    shippingAddress: {
      name: row.shipping_name ?? "",
      addressLine1: row.shipping_address_line1 ?? "",
      addressLine2: row.shipping_address_line2,
      postalCode: row.shipping_postal_code ?? "",
      city: row.shipping_city ?? "",
      country: row.shipping_country ?? "",
    },
    paymentMethod: row.payment_method ?? "",
    stripePaymentIntentId: row.stripe_payment_intent_id ?? null,
    paypalCaptureId: row.paypal_capture_id ?? null,
    isPaid: Boolean(row.is_paid),
    paidAt: row.paid_at ?? null,
    isDelivered: Boolean(row.is_delivered),
    deliveredAt: row.delivered_at ?? null,
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
        }
      : { id: row.user_id, name: "Unknown", email: "", isAdmin: false },
  };
}

function orderRowsToOrders(rows: OrderRow[]): Order[] {
  return rows.map(mapRowToOrder);
}

const ORDER_SELECT_FIELDS = `
  id,
  user_id,
  created_at,
  total_price,
  items,
  shipping_name,
  shipping_address_line1,
  shipping_address_line2,
  shipping_postal_code,
  shipping_city,
  shipping_country,
  payment_method,
  stripe_payment_intent_id,
  paypal_capture_id,
  is_paid,
  paid_at,
  is_delivered,
  delivered_at
`;

export function findAllOrders(): Order[] {
  const rows = db
    .prepare(
      `SELECT ${ORDER_SELECT_FIELDS} FROM orders ORDER BY created_at DESC`
    )
    .all() as OrderRow[];
  return orderRowsToOrders(rows);
}

export function findOrdersByUserId(userId: string): Order[] {
  const rows = db
    .prepare(
      `SELECT ${ORDER_SELECT_FIELDS} FROM orders WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(userId) as OrderRow[];
  return orderRowsToOrders(rows);
}

export function searchOrders(query: string): Order[] {
  const q = `%${query.trim()}%`;
  const byId = db
    .prepare(
      `SELECT ${ORDER_SELECT_FIELDS} FROM orders WHERE id LIKE ? ORDER BY created_at DESC`
    )
    .all(q) as OrderRow[];
  const userIdRows = db
    .prepare("SELECT id FROM users WHERE name LIKE ? OR email LIKE ?")
    .all(q, q) as { id: string }[];
  const userIds = userIdRows.map((r) => r.id);
  let byUser: OrderRow[] = [];
  if (userIds.length > 0) {
    const placeholders = userIds.map(() => "?").join(",");
    byUser = db
      .prepare(
        `SELECT ${ORDER_SELECT_FIELDS} FROM orders WHERE user_id IN (${placeholders}) ORDER BY created_at DESC`
      )
      .all(...userIds) as OrderRow[];
  }
  const seen = new Set<string>();
  const merged: OrderRow[] = [];
  for (const row of byId) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      merged.push(row);
    }
  }
  for (const row of byUser) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      merged.push(row);
    }
  }
  merged.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return orderRowsToOrders(merged);
}

export function deleteOrderById(id: string): boolean {
  const order = findOrderById(id);
  if (!order) {
    return false;
  }

  const del = db.prepare("DELETE FROM orders WHERE id = ?");

  const run = db.transaction(() => {
    incrementStockForLines(
      order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
    );
    deleteChatMessagesByOrderId(id);
    const result = del.run(id);
    if (result.changes <= 0) {
      throw new Error("Failed to delete order");
    }
  });

  run();
  return true;
}

export function findOrderById(id: string): Order | null {
  const row = db
    .prepare(
      `SELECT ${ORDER_SELECT_FIELDS} FROM orders WHERE id = ?`
    )
    .get(id) as OrderRow | undefined;
  if (!row) {
    return null;
  }
  return mapRowToOrder(row);
}

export function createOrder(params: {
  userId: string;
  items: OrderItem[];
  shippingAddress: OrderShippingAddress;
  paymentMethod: string;
  stripePaymentIntentId?: string | null;
  paypalCaptureId?: string | null;
  isPaid?: boolean;
  paidAt?: string | null;
  totalPrice: number;
  t: TranslateFn;
}): Order {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const itemsJson = JSON.stringify(
    params.items.map((item) => ({
      productId: item.productId,
      title: item.title,
      quantity: item.quantity,
      price: item.price,
    }))
  );

  const insert = db.prepare(
    `INSERT INTO orders (
      id,
      user_id,
      created_at,
      total_price,
      items,
      shipping_name,
      shipping_address_line1,
      shipping_address_line2,
      shipping_postal_code,
      shipping_city,
      shipping_country,
      payment_method,
      stripe_payment_intent_id,
      paypal_capture_id,
      is_paid,
      paid_at,
      is_delivered,
      delivered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const run = db.transaction((): Order => {
    const isPaid = Boolean(params.isPaid);
    const paidAt = isPaid ? params.paidAt ?? createdAt : null;

    decrementStockForLines(
      params.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      params.t
    );
    insert.run(
      id,
      params.userId,
      createdAt,
      params.totalPrice,
      itemsJson,
      params.shippingAddress.name,
      params.shippingAddress.addressLine1,
      params.shippingAddress.addressLine2 ?? null,
      params.shippingAddress.postalCode,
      params.shippingAddress.city,
      params.shippingAddress.country,
      params.paymentMethod,
      params.stripePaymentIntentId ?? null,
      params.paypalCaptureId ?? null,
      isPaid ? 1 : 0,
      paidAt,
      0,
      null
    );
    const order = findOrderById(id);
    if (!order) {
      throw new Error("Failed to create order");
    }
    return order;
  });

  return run();
}

export type SetOrderPaidResult = {
  order: Order | null;
  newlyPaid: boolean;
};

export function setOrderPaidByStripePaymentIntentId(
  stripePaymentIntentId: string
): SetOrderPaidResult {
  const row = db
    .prepare(
      `SELECT ${ORDER_SELECT_FIELDS} FROM orders WHERE stripe_payment_intent_id = ?`
    )
    .get(stripePaymentIntentId) as OrderRow | undefined;

  if (!row) {
    return { order: null, newlyPaid: false };
  }

  if (Boolean(row.is_paid)) {
    return { order: mapRowToOrder(row), newlyPaid: false };
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `
      UPDATE orders
      SET is_paid = 1, paid_at = ?
      WHERE stripe_payment_intent_id = ? AND IFNULL(is_paid, 0) = 0
    `
    )
    .run(now, stripePaymentIntentId);

  if (result.changes <= 0) {
    const current = db
      .prepare(
        `SELECT ${ORDER_SELECT_FIELDS} FROM orders WHERE stripe_payment_intent_id = ?`
      )
      .get(stripePaymentIntentId) as OrderRow | undefined;
    return {
      order: current ? mapRowToOrder(current) : null,
      newlyPaid: false,
    };
  }

  logger.info("order marked paid via Stripe", {
    paymentIntentId: stripePaymentIntentId,
  });

  const updated = db
    .prepare(
      `SELECT ${ORDER_SELECT_FIELDS} FROM orders WHERE stripe_payment_intent_id = ?`
    )
    .get(stripePaymentIntentId) as OrderRow | undefined;

  return {
    order: updated ? mapRowToOrder(updated) : null,
    newlyPaid: true,
  };
}

/** Removes an unpaid Stripe order and restores stock (e.g. payment failed). */
export function cancelUnpaidOrderByStripePaymentIntentId(
  stripePaymentIntentId: string
): boolean {
  const row = db
    .prepare(
      `SELECT ${ORDER_SELECT_FIELDS} FROM orders WHERE stripe_payment_intent_id = ? AND IFNULL(is_paid, 0) = 0`
    )
    .get(stripePaymentIntentId) as OrderRow | undefined;
  if (!row) {
    return false;
  }
  const order = mapRowToOrder(row);
  const run = db.transaction(() => {
    deleteChatMessagesByOrderId(order.id);
    incrementStockForLines(
      order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
    );
    const del = db.prepare("DELETE FROM orders WHERE id = ?").run(order.id);
    if (del.changes <= 0) {
      throw new Error("Failed to delete cancelled order");
    }
  });
  run();
  logger.info("unpaid Stripe order cancelled; stock restored", {
    orderId: order.id,
    paymentIntentId: stripePaymentIntentId,
  });
  return true;
}

export function markOrderDeliveredById(id: string): Order | null {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `
      UPDATE orders
      SET is_delivered = 1, delivered_at = ?
      WHERE id = ?
    `
    )
    .run(now, id);
  if (result.changes <= 0) return null;
  return findOrderById(id);
}
