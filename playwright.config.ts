import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: [
    {
      command: "npx tsx tests/generation-server.ts",
      url: "http://127.0.0.1:8788/api/generation/status",
      reuseExistingServer: false,
    },
    {
      command: "SKETCH_API_PORT=8788 npm run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
    },
  ],
  reporter: "list",
});
