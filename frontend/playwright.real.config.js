import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) throw new Error("E2E_BASE_URL is required for the real E2E suite");

export default defineConfig({
  testDir: "./e2e",
  testMatch: "real-router-postgres.spec.js",
  outputDir: "./test-results-real",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "real-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
