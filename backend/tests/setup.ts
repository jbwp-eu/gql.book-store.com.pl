/** Must run before any import of `auth/jwt.ts` (evaluated at module load). */
process.env.JWT_SECRET = "vitest-jwt-secret-must-be-at-least-32-chars";
