import { db } from "../db.js";

/** Returns true if this event id was inserted (first time); false if duplicate. */
export function tryInsertStripeEventId(eventId: string): boolean {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO stripe_webhook_events (id, processed_at) VALUES (?, ?)`
  );
  const result = stmt.run(eventId, new Date().toISOString());
  return result.changes > 0;
}
