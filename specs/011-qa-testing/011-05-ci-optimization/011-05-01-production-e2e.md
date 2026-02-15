# Subtask 011-05-01: 本番URL対向E2Eテスト

## 概要

`playwright.config.ts` にリモートURL対応を追加し、`.github/workflows/ci.yml` を修正して、mainプッシュ時のE2Eを本番URL対向に変更する。PR時のローカルビルドE2Eは廃止し、E2EジョブをリモートURL専用に切り替える。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: mainマージ後に本番環境のE2Eテストを自動実行する
**価値**: Vercel固有の問題（ルーティング、環境変数、ビルド最適化等）を即座に検知できる
**理由**: ローカルビルドは本番環境と異なるため、テスト対象として不適切

## 受け入れ条件（EARS記法）

- [ ] AC1: WHEN mainブランチにプッシュされた際
      GIVEN `PRODUCTION_URL` シークレットが設定されている場合
      THEN e2e ジョブが本番URLに対して実行される
      AND `PLAYWRIGHT_BASE_URL` に本番URLが設定される

- [ ] AC2: WHEN `PLAYWRIGHT_BASE_URL` 環境変数が設定されている場合
      GIVEN playwright.config.ts が読み込まれた際
      THEN `baseURL` が環境変数の値に設定される
      AND `webServer` が起動しない（ローカルサーバー不要）

- [ ] AC3: WHEN CIのe2eジョブが実行される際
      GIVEN リモートURL対向で実行する場合
      THEN Build ステップ（`pnpm --filter web build`）がスキップされる
      AND ローカルサーバーが起動しない

- [ ] AC4: WHEN PRが作成/更新された際
      GIVEN 011-05-02が未実装の場合
      THEN e2e ジョブはスキップされる（ローカルビルドE2Eは実行しない）
      AND ci ジョブ（lint, format, type-check, unit test）は実行される

## 設計

### 1. playwright.config.ts の変更

```typescript
// Before（現状）
export default defineConfig({
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});

// After（修正後）
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const isRemote = !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  use: { baseURL },
  // ローカル開発時のみwebServer起動（CI上では常にリモートURL対向）
  ...(isRemote
    ? {}
    : {
        webServer: {
          command: "pnpm dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
        },
      }),
});
```

### 2. ci.yml の変更

```yaml
# Before（現状）: 全トリガーでローカルビルドE2E
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: ci
  steps:
    - name: Build
      run: pnpm --filter web build
    - name: Run Critical E2E Tests
      run: pnpm --filter web test:e2e --grep @critical

# After（修正後）: mainプッシュ時のみ本番URL対向E2E
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: ci
  if: github.event_name == 'push'
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: "20"
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Install Playwright Browsers
      run: pnpm --filter web exec playwright install --with-deps chromium

    # Build ステップは不要（リモートURL対向のため）

    - name: Run Critical E2E Tests
      run: pnpm --filter web test:e2e --grep @critical
      env:
        PLAYWRIGHT_BASE_URL: ${{ secrets.PRODUCTION_URL }}

    - name: Run Non-Critical E2E Tests
      run: pnpm --filter web test:e2e --grep-invert @critical
      continue-on-error: true
      env:
        PLAYWRIGHT_BASE_URL: ${{ secrets.PRODUCTION_URL }}

    - name: Upload Test Results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: apps/web/e2e/playwright-report/
        retention-days: 7
```

### 変更の影響

| トリガー      | ci ジョブ | e2e ジョブ      | Build | 対象URL     | 変更         |
| ------------- | --------- | --------------- | ----- | ----------- | ------------ |
| PR to main    | 実行      | **スキップ**    | なし  | -           | **変更あり** |
| PR to spec/\* | 実行      | **スキップ**    | なし  | -           | **変更あり** |
| PR to impl/\* | 実行      | **スキップ**    | なし  | -           | **変更あり** |
| Push to main  | 実行      | **本番URL対向** | なし  | **本番URL** | **変更あり** |

> **注**: PR時のE2Eは011-05-02で復活（プレビューURL対向）。それまではci ジョブ（unit test/lint）のみがPRの品質ゲート。

### リスク評価

| リスク                              | 影響度 | 発生頻度 | 対策                                            |
| ----------------------------------- | ------ | -------- | ----------------------------------------------- |
| 本番デプロイが未完了でE2Eが先に走る | 中     | 中       | ciジョブ（3-5分）の間にVercelデプロイ完了を期待 |
| `PRODUCTION_URL` シークレット未設定 | 高     | 極低     | E2Eジョブ冒頭でURL存在チェック                  |
| ネットワーク不安定による本番E2E失敗 | 低     | 低       | Playwrightの `retries: 2` で吸収                |
| PR時にE2Eが走らない期間が発生       | 中     | -        | 011-05-02で解消。unit testで最低限の品質保証    |

## テストケース

- [ ] `PLAYWRIGHT_BASE_URL` 設定時に `baseURL` が環境変数の値になる
- [ ] `PLAYWRIGHT_BASE_URL` 設定時に `webServer` が起動しない
- [ ] `PLAYWRIGHT_BASE_URL` 未設定時に `baseURL` が `localhost:3000` になる（ローカル開発用）
- [ ] mainプッシュ時にe2eジョブが本番URLに対して実行される
- [ ] PRプッシュ時にe2eジョブがスキップされる
- [ ] mainプッシュ時にciジョブは引き続き実行される
- [ ] e2eジョブのBuildステップが除去されている

## 実装メモ

- `PRODUCTION_URL` はGitHub Secretsに登録する（例: `https://recommend-scp.vercel.app`）
- mainプッシュ時はVercelが自動デプロイ → ciジョブ実行中（3-5分）にデプロイ完了を期待
- デプロイ完了を保証するため、必要に応じてe2eジョブにwaitステップを追加可能
- `webServer` 設定はローカル開発（`pnpm test:e2e` 直接実行）時にのみ使用
- PR時のE2Eは011-05-02完了まで一時的にスキップとなる
