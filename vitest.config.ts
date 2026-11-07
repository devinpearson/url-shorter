import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Playwright specs under tests/e2e run separately via `npm run test:e2e`.
    projects: [
      {
        plugins: [react()],
        test: {
          name: "web",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["src/test/setup.ts"],
        },
      },
      {
        test: {
          name: "api",
          environment: "node",
          include: ["tests/api/**/*.test.ts"],
          // Each file starts its own throwaway Postgres (PGlite).
          hookTimeout: 60_000,
          // passport-auth0 refuses to start without these; tests never reach Auth0.
          env: {
            AUTH0_DOMAIN: "club-links-test.auth0.invalid",
            AUTH0_CLIENT_ID: "test-client",
            AUTH0_CLIENT_SECRET: "test-secret",
            AUTH0_CALLBACK_URL: "http://localhost/api/auth/callback",
            ORIGIN: "http://localhost:5173",
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "backend/src/**/*.ts"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "src/test/**",
        "src/main.tsx",
        "backend/src/index.ts",
        "backend/src/env.ts",
        "backend/src/types/**",
      ],
      reporter: ["text-summary", "json-summary", "lcov"],
      // Ratchet: just below current coverage (77% lines, 70% branches, 67% functions) so it
      // can't quietly fall. Raise these as tests are added.
      thresholds: {
        lines: 75,
        statements: 73,
        branches: 68,
        functions: 65,
      },
    },
  },
});
