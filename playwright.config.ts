import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // The local sandbox already provides Edge but cannot fetch Playwright's
    // bundled browsers. CI deliberately uses Chromium above instead.
    ...(process.env.CI ? [] : [{ name: "msedge", use: { channel: "msedge" as const } }]),
  ],
  webServer: {
    command: "npm run build && npm run start -- --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
