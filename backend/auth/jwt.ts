import jwt from "jsonwebtoken";

const FORBIDDEN_JWT_SECRETS = new Set([
  "1234567890",
  "change-me",
  "change-me-long-random",
]);

/** Exported for unit tests. Rejects missing, short, and known placeholders. */
export function resolveJwtSecret(raw: string | undefined): string {
  const secret = raw?.trim() ?? "";
  if (FORBIDDEN_JWT_SECRETS.has(secret) || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be set to a random string of at least 32 characters (e.g. openssl rand -hex 32)"
    );
  }
  return secret;
}

const JWT_SECRET = resolveJwtSecret(process.env.JWT_SECRET);

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30minutes" });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded?.userId ? { userId: decoded.userId } : null;
  } catch {
    return null;
  }
}
