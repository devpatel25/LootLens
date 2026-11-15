process.loadEnvFile(".env.test"); // does not overwrite existing vars, so CI env wins

import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
  globalSetup: "./e2e/global-setup.ts",
  projects: [
    { name: "anon", testMatch: /-anon\.spec\.ts$/, use: { ...devices["Desktop Chrome"] } },
    {
      name: "authed",
      testIgnore: /-anon\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
    },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
