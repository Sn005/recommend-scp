# Subtask 002-01-02: Prettier設定とESLint連携

## 概要

Prettierを導入してコードフォーマットを自動化し、ESLintとの競合を回避する。

## ユーザーストーリー

**As a** 開発者
**I want** コードフォーマットが自動的に統一される
**So that** スタイルの議論に時間を使わず、一貫したコードベースを維持できる

## Acceptance Criteria（EARS記法）

### AC-1: Prettierフォーマット
- [ ] WHEN `pnpm format` を実行した際
      GIVEN プロジェクトルートで実行した場合
      THEN Prettierがすべての対象ファイルをフォーマットする

### AC-2: フォーマットチェック
- [ ] WHEN `pnpm format:check` を実行した際
      GIVEN フォーマット違反がある場合
      THEN 違反ファイルが一覧表示される
      AND 終了コード1で終了する

### AC-3: ESLint競合回避
- [ ] WHERE ESLint設定において
      THE SYSTEM SHALL `eslint-config-prettier` を使用する
      AND PrettierとESLintのルール競合を防止する

### AC-4: 対象ファイル
- [ ] WHERE Prettier設定において
      THE SYSTEM SHALL 以下のファイル形式を対象とする:
      - TypeScript (.ts, .tsx)
      - JavaScript (.js, .jsx, .mjs)
      - JSON (.json)
      - Markdown (.md)
      - YAML (.yml, .yaml)

## 技術設計

### インストールパッケージ

```bash
pnpm add -D -w prettier eslint-config-prettier
```

### 設定ファイル（prettier.config.mjs）

```javascript
/** @type {import("prettier").Config} */
export default {
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  printWidth: 100,
};
```

### ESLint設定更新（eslint.config.mjs）

```javascript
import prettier from "eslint-config-prettier";

export default defineConfig(
  // ... 既存設定
  prettier // 最後に配置してPrettierルールを優先
);
```

### package.json更新

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### .prettierignore

```
node_modules
dist
coverage
pnpm-lock.yaml
```

## テストケース

- [ ] `pnpm format` が正常に実行される
- [ ] `pnpm format:check` でフォーマット違反を検出できる
- [ ] ESLintとPrettierを同時実行してもエラーにならない
- [ ] .prettierignoreに指定したファイルがフォーマット対象外になる

## ステータス

- **status**: pending
