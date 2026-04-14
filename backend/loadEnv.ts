import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Project root (repo root), not process.cwd() — systemd often uses a different cwd. */
const here = path.dirname(fileURLToPath(import.meta.url));

const projectRoot = path.resolve(here, path.basename(here) === "dist" ? "../.." : "..");

const envRel =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";
dotenv.config({ path: path.join(projectRoot, envRel) });
