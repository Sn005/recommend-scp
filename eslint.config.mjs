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
      "no-console": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
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
      "packages/poc/scripts/",
    ],
  },
  // Prettierとの競合回避（必ず最後に配置）
  eslintConfigPrettier
);
