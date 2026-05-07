// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import nodePlugin from "eslint-plugin-n";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      n: nodePlugin,
    },
    rules: {
      // console.log禁止: pinoベースのloggerを使用すること
      // packages/pipeline/src/crawler/utils/logger.ts の createLogger を使用
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      // process.env直接参照禁止: env.ts経由でアクセスすること
      // packages/shared/src/lib/env.ts の env オブジェクトを使用
      "n/no-process-env": "error",
    },
  },
  // CLIスクリプトではconsole使用とprocess.env参照を許可
  {
    files: ["**/scripts/**/*.ts"],
    rules: {
      "no-console": "off",
      "n/no-process-env": "off",
    },
  },
  // テストファイルではconsole使用とprocess.env操作を許可
  // また、テストの可読性のためtype assertion styleとunbound-methodを緩和
  {
    files: ["**/__dev__/**/*.test.ts", "**/*.test.ts"],
    rules: {
      "no-console": "off",
      "n/no-process-env": "off",
      "@typescript-eslint/non-nullable-type-assertion-style": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
  // env.ts, env.client.ts, vitest.config.tsでは process.env アクセスを許可
  {
    files: ["**/src/lib/env.ts", "**/src/lib/env.client.ts", "**/vitest.config.ts"],
    rules: {
      "n/no-process-env": "off",
    },
  },
  // logger.tsではLOG_LEVEL, GITHUB_ACTIONSの参照を許可
  {
    files: ["**/src/crawler/utils/logger.ts"],
    rules: {
      "n/no-process-env": "off",
    },
  },
  // run-integration-tests.tsはexecSyncで環境変数を渡すため許可
  {
    files: ["**/scripts/run-integration-tests.ts"],
    rules: {
      "n/no-process-env": "off",
    },
  },
  // Next.js API Routes (route.ts) では process.env 直接参照を許可
  // Edge/Node.js RuntimeではNode.js固有のenv.tsが使用できないため
  {
    files: ["**/app/api/**/route.ts"],
    rules: {
      "n/no-process-env": "off",
    },
  },
  // Next.js クライアント用ファイルでは NEXT_PUBLIC_* 環境変数の直接参照を許可
  {
    files: ["**/src/shared/lib/api-client.ts"],
    rules: {
      "n/no-process-env": "off",
    },
  },
  // Playwright設定とE2Eテストヘルパーではprocess.env参照を許可
  // (CI/PLAYWRIGHT_BASE_URL/PLAYWRIGHT_API_URL等の参照が必須)
  {
    files: ["**/e2e/playwright.config.ts", "**/e2e/lib/**/*.ts"],
    rules: {
      "n/no-process-env": "off",
      "no-console": "off",
    },
  },
  {
    ignores: [
      "node_modules/",
      "dist/",
      "**/node_modules/",
      "**/dist/",
      "**/.next/",
      "supabase/",
      "**/*.js",
      "**/*.mjs",
      "**/vitest.config.ts",
      "**/coverage/",
      "packages/poc/",
      "packages/shared/", // 003-00-03でpoc移行時に解除
      "scripts/", // CLIユーティリティスクリプト（npx tsxで実行）
    ],
  },
  // Prettierとの競合回避（必ず最後に配置）
  eslintConfigPrettier
);
