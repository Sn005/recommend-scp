# Story 020-02: Vercel Analytics 導入

## ステータス

- **status**: completed
- **story-id**: 020-02
- **epic-id**: 020

## ユーザーストーリー

開発者として、scpicks.app のアクセス状況を把握するために Vercel Analytics を導入し、PV を確認できる状態にしたい。

## AC（受入条件）

- [x] @vercel/analytics パッケージがインストールされている
- [x] Analytics コンポーネントがルートレイアウトに配置されている
- [ ] Vercel ダッシュボードで PV が確認できる（本番デプロイ後）
- [ ] プライバシーポリシーに Analytics 利用について記載がある（必要に応じて）

## 実装状況

- **status**: completed
- 実装範囲: AC1 (パッケージインストール) / AC2 (ルートレイアウトへの `<Analytics />` 配置)
- 対象外:
  - AC3: 本番デプロイ後に Vercel ダッシュボードで確認する運用タスクのため、実装スコープ外
  - AC4: 現時点でプライバシーポリシーページが未整備のため「必要に応じて」に該当せず対象外。ポリシー整備時に追記する

## 技術メモ

- Vercel Analytics は Vercel ホスティング環境で自動的に動作
- `@vercel/analytics` パッケージの `<Analytics />` コンポーネントを配置するだけで基本計測が開始
- Cookie 不使用のプライバシーフレンドリーな実装
