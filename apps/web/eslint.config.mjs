import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import dataTestidNaming from "./eslint-rules/data-testid-naming.mjs";

const localPlugin = {
  rules: {
    "data-testid-naming": dataTestidNaming,
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.tsx", "**/*.jsx"],
    plugins: {
      local: localPlugin,
    },
    rules: {
      "local/data-testid-naming": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright E2E tests (own config)
    "e2e/**",
    // ESLint custom rules (JS modules)
    "eslint-rules/**",
  ]),
]);

export default eslintConfig;
