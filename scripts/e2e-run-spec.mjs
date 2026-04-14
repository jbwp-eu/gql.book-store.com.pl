import { spawnSync } from "node:child_process";

function die(message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}

function run(cmd, env) {
  const res = spawnSync(cmd, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  if (typeof res.status === "number" && res.status !== 0) process.exit(res.status);
  if (res.error) die(String(res.error?.message ?? res.error));
}

const argv = process.argv.slice(2);

// Supported:
// - npm run e2e:run:spec -- --spec cypress/e2e/foo.cy.ts
// - npm run e2e:run:spec -- cypress/e2e/foo.cy.ts
let spec;
const specFlagIdx = argv.indexOf("--spec");
if (specFlagIdx >= 0) spec = argv[specFlagIdx + 1];
if (!spec) spec = argv.find((a) => !a.startsWith("-"));

if (!spec || typeof spec !== "string") {
  die(
    [
      "Missing --spec argument.",
      "",
      "Examples:",
      '  npm run e2e:run:spec -- --spec "cypress/e2e/checkout-config-and-placeorder.cy.ts"',
      '  npm run e2e:run:spec -- "cypress/e2e/cart.cy.ts"',
      "",
    ].join("\n")
  );
}

const E2E_ENV = {
  DB_PATH: "./data/e2e.store.db",
  ADMIN_PASSWORD: "admin123",
  PORT: "4000",
  FRONTEND_ORIGIN: "http://localhost:5173",
  VITE_GRAPHQL_URL: "http://localhost:4000/graphql",
};

run("npm run e2e:reset-db", { DB_PATH: E2E_ENV.DB_PATH });

run(
  [
    "npx start-server-and-test",
    '"concurrently -k -s first \\"npm run server\\" \\"npm run e2e:client\\""',
    '"http://localhost:5173/pl|http://localhost:4000/"',
    `"cypress run --spec \\"${spec}\\""`,
  ].join(" "),
  E2E_ENV
);

