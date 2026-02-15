# Story 011-05: CI E2Eテスト実行戦略の最適化

## 概要

現在PRとmainプッシュの両方で実行されているE2Eテストの二重実行を解消し、コスト効率の良い実行戦略に最適化する。

## 背景

### 現状の問題

```
PR作成/更新 → ci (unit/lint) → e2e (Playwright) ← 品質ゲート
     ↓ マージ
Main push   → ci (unit/lint) → e2e (Playwright) ← 同一コードで再実行
```

- E2Eジョブはコストが高い（Playwright install + build + ブラウザ起動: 3-5分）
- PRで検証済みのコードがmainマージ時に再テストされる
- unit testは安価（数秒）のため二重実行の影響は小さい

### E2Eのテスト対象

現在のE2Eは**ローカルビルド**に対して実行される:

```typescript
// playwright.config.ts
baseURL: "http://localhost:3000";
webServer: {
  command: "pnpm dev";
}
```

Vercelデプロイ（プレビュー/本番）への対向テストは行っていない。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: CI実行コストを最適化しつつ品質ゲートを維持する
**価値**: GitHub Actionsの実行時間を削減できる
**理由**: 同一コードの二重テストはコストに見合わない

## 受け入れ条件（Storyレベル）

- [ ] PR時にE2Eテストが品質ゲートとして実行される
- [ ] mainプッシュ時にE2Eテストがスキップされる
- [ ] mainプッシュ時にunit test/lint/type-checkは引き続き実行される

## 関連Subtask

- [011-05-01: E2Eテスト実行タイミングの最適化](./011-05-01-e2e-trigger-optimization.md)

## 技術メモ

### 設計判断: ローカルビルド vs Vercelデプロイ対向

| 方式                   | メリット                 | デメリット                    |
| ---------------------- | ------------------------ | ----------------------------- |
| ローカルビルド（現状） | 高速、安定、Vercel非依存 | Vercel固有問題を検知不可      |
| Vercelプレビュー対向   | 本番同等環境でテスト     | 遅い（デプロイ待ち）、動的URL |

**結論**: 現段階ではローカルビルドを維持。Vercel固有問題はプレビューURLの目視確認で対応。本番運用で課題が出た場合にVercel対向テストを検討する。

### Vercelプレビュー対向テスト（将来オプション）

Vercelデプロイ完了を待ってE2Eを実行する場合の設計メモ:

```yaml
# deployment_status イベントを利用
on:
  deployment_status:

jobs:
  e2e-preview:
    if: github.event.deployment_status.state == 'success'
    steps:
      - run: pnpm --filter web test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ github.event.deployment_status.target_url }}
```

```typescript
// playwright.config.ts の変更
baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
```

この方式では `webServer` 設定を条件分岐させる必要がある（外部URLの場合はローカルサーバー起動不要）。
