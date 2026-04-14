import { db } from "../db.js";
import { findUserById, type User } from "./user.js";

export type ChatMessage = {
  id: string;
  orderId: string;
  sender: User;
  content: string;
  createdAt: string;
};

type ChatMessageRow = {
  id: string;
  order_id: string;
  sender_user_id: string;
  content: string;
  created_at: string;
};

function mapRowToChatMessage(row: ChatMessageRow): ChatMessage {
  const sender = findUserById(row.sender_user_id);
  if (!sender) {
    throw new Error("Chat message sender not found");
  }

  return {
    id: row.id,
    orderId: row.order_id,
    sender,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function findChatMessagesByOrderId(orderId: string): ChatMessage[] {
  const rows = db
    .prepare(
      `
      SELECT id, order_id, sender_user_id, content, created_at
      FROM chat_messages
      WHERE order_id = ?
      ORDER BY created_at ASC
      `
    )
    .all(orderId) as ChatMessageRow[];

  return rows.map(mapRowToChatMessage);
}

export function deleteChatMessagesByOrderId(orderId: string): void {
  db.prepare("DELETE FROM chat_messages WHERE order_id = ?").run(orderId);
}

export function createChatMessage(params: {
  orderId: string;
  senderUserId: string;
  content: string;
}): ChatMessage {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const content = params.content.trim();

  db.prepare(
    `
    INSERT INTO chat_messages (id, order_id, sender_user_id, content, created_at)
    VALUES (?, ?, ?, ?, ?)
    `
  ).run(id, params.orderId, params.senderUserId, content, createdAt);

  const row = db
    .prepare(
      `
      SELECT id, order_id, sender_user_id, content, created_at
      FROM chat_messages
      WHERE id = ?
      `
    )
    .get(id) as ChatMessageRow | undefined;

  if (!row) {
    throw new Error("Failed to create chat message");
  }

  return mapRowToChatMessage(row);
}
