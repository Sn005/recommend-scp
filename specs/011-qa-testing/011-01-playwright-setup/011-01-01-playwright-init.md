# Subtask 011-01-01: Playwrightセットアップ

## 概要

Playwright環境を `apps/web/e2e/` に構築し、基本的なE2Eテストを実行可能にする。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: Playwrightをインストールし、E2Eテストを実行できるようにする
**価値**: ブラウザ自動テストの基盤が整う
**理由**: リグレッション検知の第一歩として環境構築が必要

## 受け入れ条件（EARS記法）

- [ ] WHEN 開発者がE2Eテストを実行する際
      GIVEN Playwrightがインストールされている場合
      THEN `pnpm --filter web test:e2e` でテストが実行される
      AND Chromiumブラウザでヘッドレス実行される

- [ ] WHEN Playwright設定ファイルを参照する際
      GIVEN `apps/web/e2e/playwright.config.ts` が存在する場合
      THEN baseURLが `http://localhost:3000` に設定されている
      AND テストディレクトリが `./specs` に設定されている

- [ ] WHEN サンプルテストを実行する際
      GIVEN `apps/web/e2e/specs/sample.spec.ts` が存在する場合
      THEN トップページへのアクセステストが成功する

## 設計

### ディレクトリ構造

```
apps/web/
├── e2e/
│   ├── playwright.config.ts
│   └── specs/
│       └── sample.spec.ts
└── package.json  # scripts追加
```

### package.json 追加スクリプト

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### playwright.config.ts

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

## テストケース

- [ ] `pnpm --filter web test:e2e` が正常終了する
- [ ] playwright.config.ts が正しく読み込まれる
- [ ] sample.spec.ts が実行され、パスする

## 実装メモ

- `@playwright/test` を devDependencies に追加
- Chromiumのみ使用（マルチブラウザは将来対応）
- webServer設定でNext.js開発サーバーを自動起動
