import { defineConfig, devices } from "@playwright/test";

// Full-stack E2E — needs the local Supabase stack + dev server running.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8082",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Students primarily use iPads (landscape) — a tablet-viewport project alongside desktop.
      name: "ipad",
      use: { ...devices["iPad (gen 7)"] },
    },
  ],
});
