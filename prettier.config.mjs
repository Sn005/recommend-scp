// @ts-check

/**
 * Prettier設定
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
const config = {
  // 基本設定
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  useTabs: false,
  trailingComma: "es5",
  printWidth: 100,

  // 括弧設定
  bracketSpacing: true,
  arrowParens: "always",

  // 改行設定
  endOfLine: "lf",
};

export default config;
