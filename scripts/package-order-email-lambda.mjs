import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const lambdaDir = path.join(repoRoot, "lambda", "order-confirmation-email");
const zipPath = path.join(lambdaDir, "function.zip");

for (const name of ["index.mjs", "package.json", "node_modules"]) {
  const entry = path.join(lambdaDir, name);
  if (!fs.existsSync(entry)) {
    console.error(`Missing ${entry}. Run: npm install --omit=dev --prefix lambda/order-confirmation-email`);
    process.exit(1);
  }
}

fs.rmSync(zipPath, { force: true });

if (process.platform === "win32") {
  const dir = lambdaDir.replace(/'/g, "''");
  execSync(
    `powershell -NoProfile -Command "Set-Location -LiteralPath '${dir}'; Compress-Archive -Path 'index.mjs','package.json','node_modules' -DestinationPath 'function.zip' -CompressionLevel Optimal"`,
    { stdio: "inherit" },
  );
} else {
  execSync("zip -r function.zip index.mjs package.json node_modules", {
    cwd: lambdaDir,
    stdio: "inherit",
  });
}

console.log(`Created ${zipPath}`);
