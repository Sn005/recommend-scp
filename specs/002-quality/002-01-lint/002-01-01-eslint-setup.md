# Subtask 002-01-01: ESLint v9 Flat Config設定

## 概要

ESLint v9をFlat Config形式で設定し、typescript-eslintによる厳密な型チェックを有効化する。

## ユーザーストーリー

**As a** 開発者
**I want** ESLintで厳密な型チェックルールが適用される
**So that** 型安全性の問題を早期に発見できる

## Acceptance Criteria（EARS記法）

### AC-1: ESLint v9インストール
- [ ] WHEN `pnpm lint` を実行した際
      GIVEN プロジェクトルートで実行した場合
      THEN ESLint v9がFlat Config形式で実行される
      AND TypeScriptファイルが検査される

### AC-2: 厳密な型チェックルール
- [ ] WHERE ESLint設定において
      IF TypeScriptファイルを検査する場合
      THE SYSTEM SHALL `@typescript-eslint/strict-type-checked` を適用する
      AND `@typescript-eslint/stylistic-type-checked` を適用する

### AC-3: カスタムルール
- [ ] WHERE ESLint設定において
      THE SYSTEM SHALL 以下のルールを有効化する:
      - `no-console`: warn
      - `@typescript-eslint/no-explicit-any`: error
      - `@typescript-eslint/no-unused-vars`: error
      - `@typescript-eslint/consistent-type-imports`: error
      - `@typescript-eslint/no-floating-promises`: error

### AC-4: パッケージスクリプト
- [ ] WHEN ルートの `package.json` を確認した際
      THEN `lint` スクリプトが定義されている
      AND `pnpm lint` でモノレポ全体がlintされる

## 技術設計

### インストールパッケージ

```bash
pnpm add -D -w eslint @eslint/js typescript-eslint
```

### 設定ファイル（eslint.config.mjs）

```javascript
// @ts-check
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
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
  }
);
```

### package.json更新

```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

## テストケース

- [ ] `pnpm lint` が正常に実行される
- [ ] `any` 型を使用したコードでエラーが出る
- [ ] 未使用変数でエラーが出る
- [ ] floating promiseでエラーが出る
- [ ] console.logで警告が出る

## ステータス

- **status**: pending
