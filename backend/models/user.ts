import bcrypt from "bcryptjs";
import { db, rowToUser } from "../db.js";

export type User = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  password: string;
  is_admin: number;
};

export function findUserByEmail(email: string): UserRow | null {
  const row = db
    .prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
    .get(email.trim()) as UserRow | undefined;
  return row ?? null;
}

export function findUserById(id: string): User | null {
  const row = db
    .prepare("SELECT id, name, email, is_admin FROM users WHERE id = ?")
    .get(id) as
    | { id: string; name: string; email: string; is_admin: number }
    | undefined;
  return row ? rowToUser(row) : null;
}

export function findAllUsers(): User[] {
  const rows = db
    .prepare("SELECT id, name, email, is_admin FROM users")
    .all() as { id: string; name: string; email: string; is_admin: number }[];
  return rows.map(rowToUser);
}

export function searchUsers(query: string): User[] {
  const q = `%${query.trim()}%`;
  const rows = db
    .prepare(
      "SELECT id, name, email, is_admin FROM users WHERE name LIKE ? OR email LIKE ?"
    )
    .all(q, q) as {
    id: string;
    name: string;
    email: string;
    is_admin: number;
  }[];
  return rows.map(rowToUser);
}

export async function verifyPassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const id = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(password, 10);
  db.prepare(
    "INSERT INTO users (id, name, email, password, is_admin) VALUES (?, ?, ?, ?, 0)"
  ).run(id, name.trim(), email.trim(), hashedPassword);
  const user = findUserById(id);
  if (!user) throw new Error("Failed to create user");
  return user;
}

export function toUser(row: UserRow): User {
  return rowToUser(row);
}

export type UpdateUserParams = {
  id: string;
  name?: string;
  email?: string;
  password?: string;
};

export async function updateUser(params: UpdateUserParams): Promise<User> {
  const { id, name, email, password } = params;
  if (!name && !email && !password) {
    throw new Error(
      "At least one of name, email, or password must be provided"
    );
  }

  if (email !== undefined) {
    const existing = findUserByEmail(email.trim());
    if (existing && existing.id !== id) {
      throw new Error("Email already in use by another user");
    }
  }

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (name !== undefined) {
    updates.push("name = ?");
    values.push(name.trim());
  }
  if (email !== undefined) {
    updates.push("email = ?");
    values.push(email.trim());
  }
  if (password !== undefined && password.length > 0) {
    updates.push("password = ?");
    values.push(await bcrypt.hash(password, 10));
  }

  if (updates.length === 0) {
    const user = findUserById(id);
    if (!user) throw new Error("User not found");
    return user;
  }

  values.push(id);
  const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
  db.prepare(sql).run(...values);

  const user = findUserById(id);
  if (!user) throw new Error("User not found");
  return user;
}

export function deleteUserById(id: string): boolean {
  const row = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(id) as
    | { is_admin: number }
    | undefined;

  if (!row) {
    return false;
  }

  if (row.is_admin) {
    throw new Error("Cannot delete admin user");
  }

  const result = db.transaction(() => {
    db.prepare("DELETE FROM reviews WHERE user_id = ?").run(id);
    db.prepare("DELETE FROM orders WHERE user_id = ?").run(id);
    return db.prepare("DELETE FROM users WHERE id = ?").run(id);
  })();

  return result.changes > 0;
}
