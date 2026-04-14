import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "1234567890";

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
