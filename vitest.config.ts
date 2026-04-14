import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** Force a single graphql entry (Vitest otherwise loads CJS + ESM and breaks schema instanceof checks). */
const graphqlAlias = path.resolve(dirname, "node_modules/graphql/index.js");

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        resolve: {
          alias: {
            graphql: graphqlAlias,
          },
        },
        test: {
          name: "backend",
          root: ".",
          include: ["backend/tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        plugins: [react()],
        root: path.resolve(dirname, "frontend"),
        test: {
          name: "frontend",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["src/test/setup.ts"],
        },
      },
    ],
  },
});
