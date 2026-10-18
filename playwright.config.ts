import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/healthz",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
