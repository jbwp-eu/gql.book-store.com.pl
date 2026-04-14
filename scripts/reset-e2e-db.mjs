import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const dataDir = path.join(repoRoot, "data");
const dbPath = process.env.DB_PATH || path.join(dataDir, "e2e.store.db");

// First, try to remove the existing database file if it exists
try {
  fs.rmSync(dbPath, { force: true });
} catch {
  // ignore
}

// Then, ensure the directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

console.log(`E2E DB reset: ${dbPath}`);

