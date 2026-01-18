// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

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
    rules: {
      // console.log禁止: pinoベースのloggerを使用すること
      // packages/pipeline/src/crawler/utils/logger.ts の createLogger を使用
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  // CLIスクリプトではconsole使用を許可
  {
    files: ["**/scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
  // テストファイルではconsole使用を許可（スキップメッセージ等）
  {
    files: ["**/__dev__/**/*.test.ts", "**/*.test.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: [
      "node_modules/",
      "dist/",
      "**/node_modules/",
      "**/dist/",
      "supabase/",
      "**/*.js",
      "**/*.mjs",
      "**/vitest.config.ts",
      "**/coverage/",
      "packages/poc/",
      "packages/shared/", // 003-00-03でpoc移行時に解除
    ],
  },
  // Prettierとの競合回避（必ず最後に配置）
  eslintConfigPrettier
);
