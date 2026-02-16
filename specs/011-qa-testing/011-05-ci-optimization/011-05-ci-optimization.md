# Story 011-05: CI E2Eテスト実行戦略の最適化

## 概要

E2Eテストの実行対象をローカルビルドからリモート環境（本番URL/プレビューURL）に完全移行し、実際のデプロイ環境に対する品質保証を実現する。

## 背景

### 現状の課題

```
現状:
PR作成/更新 → ci → e2e (localhost:3000) ← ローカルビルド
     ↓ マージ
Main push   → ci → e2e (localhost:3000) ← 同一ローカルビルドで再実行
```

1. E2Eテストはローカルビルド（`localhost:3000`）に対して実行される
2. 本番環境（Vercel）固有の問題（ルーティング、環境変数、ビルド最適化等）を検知できない
3. PRとmain pushで同じローカルビルドに対する二重テストが発生
4. ローカルビルドは本番環境と異なるため、テスト結果の信頼性が低い

### 新方針

```
目標:
PR作成/更新 → ci → e2e (Vercelプレビュー URL) ← デプロイ済み環境を検証
     ↓ マージ
Main push   → ci → e2e (本番 URL)             ← 本番環境を検証
```

- **mainマージ時**: 本番URL対向E2E（**必須**）
- **PR作成時**: VercelプレビューURL対向E2E（**URL取得が可能な場合**）
- **ローカルビルドE2E**: **廃止**（CIでは実行しない）

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: E2Eテストを実際のデプロイ環境に対して実行する
**価値**: 本番環境と同一の条件でテストすることで、デプロイ後の問題を事前に検知できる
**理由**: ローカルビルドではVercel環境特有の挙動を再現できず、テスト結果が本番の品質を保証しない

## 受け入れ条件（Storyレベル）

- [ ] mainマージ時にE2Eテストが本番URLに対して実行される
- [ ] playwright.config.tsが環境変数（`PLAYWRIGHT_BASE_URL`）でbaseURLを切り替え可能
- [ ] CIのE2Eジョブからローカルビルド（Build ステップ、webServer起動）が除去される
- [ ] （オプション）PR時にVercelプレビューURLに対してE2Eが実行される
- [ ] mainプッシュ時にunit test/lint/type-checkは引き続き実行される

## 関連Subtask

- [011-05-01: 本番URL対向E2Eテスト](./011-05-01-production-e2e.md)
- [011-05-02: PRプレビューURL対向E2Eテスト](./011-05-02-preview-e2e.md)

## 技術メモ

### Playwright設定の変更方針

```typescript
// playwright.config.ts（修正後）
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const isRemote = !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  use: { baseURL },
  // リモートURL時はローカルサーバーを起動しない
  // ローカル開発時（PLAYWRIGHT_BASE_URL未設定）のみwebServer起動
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

### VercelプレビューURL取得方法の比較

| 方式                                     | 信頼性 | 複雑さ | 備考                                        |
| ---------------------------------------- | ------ | ------ | ------------------------------------------- |
| `deployment_status` イベント             | 中     | 低     | Vercel GitHub Appが必要、タイミング問題あり |
| `zentered/vercel-preview-url` アクション | 高     | 中     | Vercel API経由、ポーリング可能              |
| Vercel CLI デプロイ                      | 高     | 高     | GitHub App不要だが設定が複雑                |

### 本番URL管理

本番URLはGitHub Secretsで管理する:

```yaml
env:
  PLAYWRIGHT_BASE_URL: ${{ secrets.PRODUCTION_URL }}
```
