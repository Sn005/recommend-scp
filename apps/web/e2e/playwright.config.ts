import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isRemote = !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./specs",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    // E2Eテスト時はService Workerを無効化
    // 本番デプロイのWorkbox SWがpage.route()モックと干渉するのを防止
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // ローカル開発時のみwebServer起動（リモートURL対向時は不要）
  ...(isRemote
    ? {}
    : {
        webServer: {
          command: "pnpm dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          env: {
            // E2Eテストではpage.route()で全APIをモックするため、
            // 実際のAPIサーバーは不要。未設定時のクラッシュを防止
            NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
          },
        },
      }),
});
