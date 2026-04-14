import { db } from "../db.js";
import { findUserById } from "./user.js";
import { findProductById } from "./product.js";

export type Review = {
  id: string;
  createdAt: string;
  rating: number;
  comment: string;
  user: { id: string; name: string; email: string; isAdmin: boolean };
  product: { id: string; title: string };
};

type ReviewRow = {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string;
  created_at: string;
};

function reviewRowsToReviews(rows: ReviewRow[]): Review[] {
  return rows.map((row) => {
    const user = findUserById(row.user_id);
    const product = findProductById(row.product_id);
    return {
      id: row.id,
      createdAt: row.created_at,
      rating: row.rating,
      comment: row.comment,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
          }
        : { id: row.user_id, name: "Unknown", email: "", isAdmin: false },
      product: product
        ? { id: product.id, title: product.title }
        : { id: row.product_id, title: "Unknown" },
    };
  });
}

export function findAllReviews(): Review[] {
  const rows = db
    .prepare(
      "SELECT id, user_id, product_id, rating, comment, created_at FROM reviews ORDER BY created_at DESC"
    )
    .all() as ReviewRow[];
  return reviewRowsToReviews(rows);
}

export function findReviewsByUserId(userId: string): Review[] {
  const rows = db
    .prepare(
      "SELECT id, user_id, product_id, rating, comment, created_at FROM reviews WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(userId) as ReviewRow[];
  return reviewRowsToReviews(rows);
}

export function searchReviews(query: string): Review[] {
  const q = `%${query.trim()}%`;
  const rows = db
    .prepare(
      `SELECT r.id, r.user_id, r.product_id, r.rating, r.comment, r.created_at
       FROM reviews r
       LEFT JOIN products p ON r.product_id = p.id
       WHERE r.comment LIKE ? OR p.title LIKE ?
       ORDER BY r.created_at DESC`
    )
    .all(q, q) as ReviewRow[];
  return reviewRowsToReviews(rows);
}

export function findReviewsByProductId(productId: string): Review[] {
  const rows = db
    .prepare(
      "SELECT id, user_id, product_id, rating, comment, created_at FROM reviews WHERE product_id = ? ORDER BY created_at DESC"
    )
    .all(productId) as ReviewRow[];
  return reviewRowsToReviews(rows);
}

export function hasReviewForUserAndProduct(
  userId: string,
  productId: string
): boolean {
  const row = db
    .prepare(
      "SELECT 1 as ok FROM reviews WHERE user_id = ? AND product_id = ? LIMIT 1"
    )
    .get(userId, productId) as { ok: number } | undefined;
  return Boolean(row);
}

export function createReviewByUser(input: {
  userId: string;
  productId: string;
  rating: number;
  comment: string;
}): Review {
  const { userId, productId, rating, comment } = input;

  const existingProduct = findProductById(productId);
  if (!existingProduct) {
    throw new Error("Product not found");
  }

  if (hasReviewForUserAndProduct(userId, productId)) {
    throw new Error("You have already reviewed this product.");
  }

  // Note: rating/comment validation should mostly happen in GraphQL resolvers,
  // but we keep a couple of cheap checks here too.
  if (!Number.isInteger(rating)) {
    throw new Error("Rating must be an integer.");
  }

  const trimmedComment = comment.trim();
  if (trimmedComment.length === 0) {
    throw new Error("Comment is required.");
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    db.prepare(
      "INSERT INTO reviews (id, user_id, product_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, userId, productId, rating, trimmedComment, createdAt);
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code.includes("SQLITE_CONSTRAINT")) {
      throw new Error("You have already reviewed this product.");
    }
    throw err;
  }

  const row = db
    .prepare(
      "SELECT id, user_id, product_id, rating, comment, created_at FROM reviews WHERE id = ?"
    )
    .get(id) as ReviewRow | undefined;

  if (!row) {
    // Should never happen after a successful INSERT.
    throw new Error("Failed to create review.");
  }

  return reviewRowsToReviews([row])[0];
}

export function deleteReviewById(id: string): boolean {
  const result = db.prepare("DELETE FROM reviews WHERE id = ?").run(id);
  return result.changes > 0;
}
