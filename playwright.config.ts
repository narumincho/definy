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
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    headless: true,
    ...(process.env.CI
      ? {
          channel: "chrome",
          launchOptions: {
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          },
        }
      : {}),
  },
  ...(process.env.PLAYWRIGHT_BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://localhost:5173/healthz",
          reuseExistingServer: true,
          timeout: 30000,
        },
      }),
});
