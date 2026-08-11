import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Project root (repo root), not process.cwd() — systemd often uses a different cwd. */
const here = path.dirname(fileURLToPath(import.meta.url));

const projectRoot = path.resolve(
  here,
  path.basename(here) === "dist" ? "../.." : ".."
);

/**
 * Dev: always `.env`.
 * Production: prefer `.env.production` (VPS / systemd); fall back to `.env`
 * so local `npm start` works with a single env file.
 */
function resolveEnvFile(): string {
  const preferProduction = process.env.NODE_ENV === "production";
  const productionPath = path.join(projectRoot, ".env.production");
  const defaultPath = path.join(projectRoot, ".env");

  if (preferProduction && fs.existsSync(productionPath)) {
    return productionPath;
  }
  return defaultPath;
}

dotenv.config({ path: resolveEnvFile() });
