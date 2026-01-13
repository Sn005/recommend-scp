import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    // 統合テスト(__dev__ディレクトリ)はSupabase接続が必要なためCIでは除外
    exclude: ["**/node_modules/**", "**/dist/**", "**/__dev__/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/__dev__/**", "src/types.ts", "src/lib/env.ts"],
    },
  },
});
