import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = 5100;
const API_PORT = 5101;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  webServer: [
    {
      // Real backend on an in-memory MongoDB, with a test-only login.
      command: "npx tsx tests/e2e/api-server.ts",
      url: `http://127.0.0.1:${API_PORT}/api/ping`,
      env: { E2E_API_PORT: String(API_PORT) },
      reuseExistingServer: false,
      // The first run downloads the MongoDB binary.
      timeout: 180_000,
    },
    {
      // The production build, as it will be served.
      command: `npx vite build && npx vite preview --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      url: `http://127.0.0.1:${WEB_PORT}/`,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
