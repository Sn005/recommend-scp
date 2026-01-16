# Story-003-04: パイプラインオーケストレーション

## 概要

クロール、Embedding生成、タグ抽出を統合実行するオーケストレーターと、
GitHub Actionsによる定期実行、通知・リトライ機能を実装する。

## ユーザーストーリー

**As a** 開発者/運用者
**I want** パイプライン全体を自動で定期実行する
**So that** 手動介入なしでデータを最新に保てる

## Acceptance Criteria（概要）

- パイプラインオーケストレーター（統合実行、コスト制御）
- GitHub Actions定期実行（週次cron）
- 通知・リトライ機能（メール通知、失敗記事再処理）

## 関連Subtask

- [003-04-01: パイプラインオーケストレーター](./003-04-01-orchestrator.md)
- [003-04-02: GitHub Actions定期実行](./003-04-02-github-actions.md)
- [003-04-03: 通知・リトライ機能](./003-04-03-notification-retry.md)

## 環境設定

- [環境変数設定手順書](../../../packages/pipeline/docs/env-setup.md) - 必要な環境変数の一覧と取得方法
