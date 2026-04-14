import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    /**
     * The app always redirects to `/:lang`, so using `/pl` avoids an extra redirect
     * and makes tests simpler.
     */
    baseUrl: "http://localhost:5173/pl",
    env: {
      GRAPHQL_URL: "http://localhost:4000/graphql",
      ADMIN_EMAIL: "admin@test.pl",
      ADMIN_PASSWORD: "admin123",
      TOKEN_KEY: "token",
    },
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    setupNodeEvents(on, config) {
      return config;
    },
  },
});

