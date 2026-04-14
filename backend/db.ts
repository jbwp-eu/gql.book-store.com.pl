import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";
import { mkdirSync, existsSync } from "fs";
import PRODUCTS from "./products.js";

const dataDir = path.join(process.cwd(), "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH ?? path.join(dataDir, "store.db");
console.log('process.env.DB_PATH:', process.env.DB_PATH, 'dbPath:', dbPath);
const db: InstanceType<typeof Database> = new Database(dbPath);
export { db };

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    count_in_stock INTEGER NOT NULL,
    is_featured INTEGER DEFAULT 0,
    images TEXT,
    banners TEXT
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    total_price REAL NOT NULL,
    items TEXT,
    shipping_name TEXT,
    shipping_address_line1 TEXT,
    shipping_address_line2 TEXT,
    shipping_postal_code TEXT,
    shipping_city TEXT,
    shipping_country TEXT,
    payment_method TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    sender_user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (sender_user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id TEXT PRIMARY KEY,
    processed_at TEXT NOT NULL
  );
`);

function tryAddOrderColumn(sql: string) {
  try {
    db.exec(sql);
  } catch {
    // Ignore errors (e.g. column already exists) to allow idempotent startup migrations.
  }
}

// Lightweight, idempotent migrations for the `orders` table.
tryAddOrderColumn(
  "ALTER TABLE orders ADD COLUMN stripe_payment_intent_id TEXT"
);
tryAddOrderColumn("ALTER TABLE orders ADD COLUMN paypal_capture_id TEXT");
tryAddOrderColumn("ALTER TABLE orders ADD COLUMN is_paid INTEGER DEFAULT 0");
tryAddOrderColumn("ALTER TABLE orders ADD COLUMN paid_at TEXT");
tryAddOrderColumn(
  "ALTER TABLE orders ADD COLUMN is_delivered INTEGER DEFAULT 0"
);
tryAddOrderColumn("ALTER TABLE orders ADD COLUMN delivered_at TEXT");

// At most one review per user per product (idempotent; fails if duplicates exist).
try {
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_product ON reviews(user_id, product_id)"
  );
} catch {
  // Ignore if duplicates exist in legacy DB; application layer still enforces.
}

try {
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_chat_messages_order_created ON chat_messages(order_id, created_at)"
  );
} catch {
  // Ignore startup errors for idempotent local development.
}

function seedProducts() {
  // 'db' is an instance of the Database class from 'better-sqlite3', representing the SQLite database connection
  const count = db.prepare("SELECT COUNT(*) as c FROM products").get() as {
    c: number;
  };
  if (count.c > 0) return;

  const insert = db.prepare(`
    INSERT INTO products (id, title, description, price, count_in_stock, is_featured, images, banners)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of PRODUCTS) {
    insert.run(
      p.id,
      p.title,
      p.description ?? "",
      p.price,
      p.countInStock,
      p.isFeatured ? 1 : 0,
      JSON.stringify(p.images ?? []),
      JSON.stringify(p.banners ?? [])
    );
  }
}

function seedOrders(): void {
  const count = db.prepare("SELECT COUNT(*) as c FROM orders").get() as {
    c: number;
  };
  if (count.c > 0) return;
  db.prepare(
    `
    INSERT INTO orders (id, user_id, created_at, total_price)
    VALUES (?, ?, ?, ?)
  `
  ).run("1", "1", new Date().toISOString(), 100);
}

function seedReviews(): void {
  const count = db.prepare("SELECT COUNT(*) as c FROM reviews").get() as {
    c: number;
  };
  if (count.c > 0) return;
  const productCount = db
    .prepare("SELECT COUNT(*) as c FROM products")
    .get() as { c: number };
  if (productCount.c === 0) return;
  const firstProduct = db.prepare("SELECT id FROM products LIMIT 1").get() as
    | { id: string }
    | undefined;
  if (!firstProduct) return;
  db.prepare(
    `
    INSERT INTO reviews (id, user_id, product_id, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run("1", "1", firstProduct.id, 5, "Great book!", new Date().toISOString());
}

async function seedUsers(): Promise<void> {
  const count = db.prepare("SELECT COUNT(*) as c FROM users").get() as {
    c: number;
  };
  if (count.c > 0) return;

  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin";
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
  db.prepare(
    `
    INSERT INTO users (id, name, email, password, is_admin)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run("1", "Admin", "admin@test.pl", hashedAdminPassword, 1);
  seedOrders();
  seedReviews();
}

seedProducts();

export const dbReady: Promise<void> = seedUsers();

export function rowToProduct(row: {
  id: string;
  title: string;
  description: string;
  price: number;
  count_in_stock: number;
  is_featured: number;
  images: string;
  banners: string;
}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price,
    countInStock: row.count_in_stock,
    isFeatured: Boolean(row.is_featured),
    images: JSON.parse(row.images || "[]") as string[],
    banners: JSON.parse(row.banners || "[]") as string[],
  };
}

export function rowToUser(row: {
  id: string;
  name: string;
  email: string;
  is_admin: number;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    isAdmin: Boolean(row.is_admin),
  };
}
