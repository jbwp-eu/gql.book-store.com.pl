import { GraphQLError } from "graphql";
import { db, rowToProduct } from "../db.js";
import type { TranslateFn } from "../i18n/t.js";

export type StockLine = {
  productId: string;
  quantity: number;
};

function aggregateStockByProductId(lines: StockLine[]): StockLine[] {
  const map = new Map<string, number>();
  for (const line of lines) {
    const productId = String(line.productId ?? "").trim();
    const quantity = Number(line.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      continue;
    }
    map.set(productId, (map.get(productId) ?? 0) + quantity);
  }
  return Array.from(map.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function assertStockAvailableForLines(
  lines: StockLine[],
  t: TranslateFn
): void {
  const aggregated = aggregateStockByProductId(lines);
  for (const { productId, quantity } of aggregated) {
    const product = findProductById(productId);
    if (!product) {
      throw new GraphQLError(t("productNotFoundWithId", { productId }));
    }
    if (product.countInStock < quantity) {
      throw new GraphQLError(
        t("insufficientStockTitle", { title: product.title })
      );
    }
  }
}

export function decrementStockForLines(
  lines: StockLine[],
  t: TranslateFn
): void {
  const aggregated = aggregateStockByProductId(lines);
  if (aggregated.length === 0) {
    return;
  }

  const update = db.prepare(
    `UPDATE products SET count_in_stock = count_in_stock - ? WHERE id = ? AND count_in_stock >= ?`
  );
  const selectId = db.prepare("SELECT id FROM products WHERE id = ?");

  for (const { productId, quantity } of aggregated) {
    const result = update.run(quantity, productId, quantity);
    if (result.changes === 1) {
      continue;
    }
    const exists = selectId.get(productId) as { id: string } | undefined;
    if (!exists) {
      throw new GraphQLError(t("productNotFoundWithId", { productId }));
    }
    throw new GraphQLError(
      t("insufficientStockProductId", { productId })
    );
  }
}

export function incrementStockForLines(lines: StockLine[]): void {
  const aggregated = aggregateStockByProductId(lines);
  if (aggregated.length === 0) {
    return;
  }

  const update = db.prepare(
    `UPDATE products SET count_in_stock = count_in_stock + ? WHERE id = ?`
  );

  for (const { productId, quantity } of aggregated) {
    const result = update.run(quantity, productId);
    if (result.changes === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `incrementStockForLines: product ${productId} not found; skipping restore`
      );
    }
  }
}

export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  countInStock: number;
  isFeatured: boolean;
  images: string[];
  banners: string[];
  /** Mean rating 1–5; 0 when there are no reviews. */
  averageRating: number;
  reviewCount: number;
};

type ReviewStatsRow = {
  product_id: string;
  avg_rating: number | null;
  review_count: number;
};

function getReviewStatsMap(): Map<
  string,
  { averageRating: number; reviewCount: number }
> {
  const rows = db
    .prepare(
      `SELECT product_id,
              AVG(rating) AS avg_rating,
              COUNT(*) AS review_count
       FROM reviews
       GROUP BY product_id`
    )
    .all() as ReviewStatsRow[];
  const map = new Map<string, { averageRating: number; reviewCount: number }>();
  for (const row of rows) {
    map.set(row.product_id, {
      averageRating: row.avg_rating != null ? Number(row.avg_rating) : 0,
      reviewCount: Number(row.review_count),
    });
  }
  return map;
}

function enrichProduct(
  base: ReturnType<typeof rowToProduct>,
  statsMap: Map<string, { averageRating: number; reviewCount: number }>
): Product {
  const s = statsMap.get(base.id);
  return {
    ...base,
    averageRating: s?.averageRating ?? 0,
    reviewCount: s?.reviewCount ?? 0,
  };
}

export function findAllProducts(): Product[] {
  const statsMap = getReviewStatsMap();
  const rows = db.prepare("SELECT * FROM products").all() as Parameters<
    typeof rowToProduct
  >[0][];
  return rows.map((row) => enrichProduct(rowToProduct(row), statsMap));
}

export function findProductById(id: string): Product | null {
  const statsMap = getReviewStatsMap();
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as
    | Parameters<typeof rowToProduct>[0]
    | undefined;
  return row ? enrichProduct(rowToProduct(row), statsMap) : null;
}

export function searchProducts(query: string): Product[] {
  const statsMap = getReviewStatsMap();
  const q = `%${query.trim()}%`;
  const rows = db
    .prepare("SELECT * FROM products WHERE title LIKE ? OR description LIKE ?")
    .all(q, q) as Parameters<typeof rowToProduct>[0][];
  return rows.map((row) => enrichProduct(rowToProduct(row), statsMap));
}

export function deleteProductById(id: string): boolean {
  const deleteReviews = db.prepare("DELETE FROM reviews WHERE product_id = ?");
  const deleteProduct = db.prepare("DELETE FROM products WHERE id = ?");
  const run = db.transaction(() => {
    deleteReviews.run(id);
    const result = deleteProduct.run(id);
    return result.changes > 0;
  });
  return run();
}

export function updateProductById(
  id: string,
  data: {
    title?: string;
    description?: string;
    price?: number;
    countInStock?: number;
    isFeatured?: boolean;
    images?: string[];
    banners?: string[];
  }
): Product | null {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as
    | Parameters<typeof rowToProduct>[0]
    | undefined;
  if (!existing) {
    return null;
  }
  const updated = {
    ...existing,
    title: data.title ?? existing.title,
    description: data.description ?? existing.description,
    price: data.price ?? existing.price,
    count_in_stock:
      data.countInStock !== undefined ? data.countInStock : existing.count_in_stock,
    is_featured:
      data.isFeatured !== undefined
        ? data.isFeatured
          ? 1
          : 0
        : existing.is_featured,
    images:
      data.images !== undefined ? JSON.stringify(data.images) : existing.images,
    banners:
      data.banners !== undefined
        ? JSON.stringify(data.banners)
        : existing.banners,
  };
  db.prepare(
    `UPDATE products
     SET title = ?, description = ?, price = ?, count_in_stock = ?, is_featured = ?, images = ?, banners = ?
     WHERE id = ?`
  ).run(
    updated.title,
    updated.description,
    updated.price,
    updated.count_in_stock,
    updated.is_featured,
    updated.images,
    updated.banners,
    id
  );
  const statsMap = getReviewStatsMap();
  return enrichProduct(rowToProduct(updated), statsMap);
}

export function createProduct(): Product {
  const id = crypto.randomUUID();
  const title = "Dummy product";
  const description = "";
  const price = 0;
  const count_in_stock = 0;
  const is_featured = 1;
  const images = JSON.stringify(["sample-cover"]);
  const banners = JSON.stringify(["sample-banner"]);
  db.prepare(
    `INSERT INTO products (id, title, description, price, count_in_stock, is_featured, images, banners)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title,
    description,
    price,
    count_in_stock,
    is_featured,
    images,
    banners
  );
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as
    Parameters<typeof rowToProduct>[0];
  const statsMap = getReviewStatsMap();
  return enrichProduct(rowToProduct(row), statsMap);
}
