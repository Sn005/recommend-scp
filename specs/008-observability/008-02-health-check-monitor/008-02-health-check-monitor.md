---
id: "008-02"
epic_id: "008"
epic_title: "運用・監視"
title: "ヘルスチェック定期監視"
status: "pending"
created_at: "2026-02-15"
updated_at: "2026-02-15"
---

# Story: ヘルスチェック定期監視

## 親EPIC

[008: 運用・監視](../008-observability.md)

## ユーザーストーリー

**ペルソナ**: 開発者・運用者
**目的**: APIサーバーの稼働状態を定期的に監視し、障害時に自動通知を受け取る
**価値**: サービスダウンを早期発見し、ユーザー影響を最小化できる
**理由**: 外部監視SaaSなしで、GitHub Actionsの無料枠内で外形監視を実現したい

> 開発者・運用者として、APIサーバーの稼働状態を1時間おきに自動監視し、障害時にGitHub Issueで通知を受け取りたい。なぜなら外部SaaSなしでサービスダウンの早期発見を実現したいから。

## Acceptance Criteria

- [ ] WHILE GitHub Actions cronワークフローが稼働中
      THE SYSTEM SHALL 1時間おきにヘルスチェックエンドポイントを呼び出す

- [ ] WHEN ヘルスチェックがdegradedまたはエラーを返した際
      THEN システムはGitHub Issueを自動作成する
      AND Issueにはレスポンスステータス・タイムスタンプ・エンドポイントURLが含まれる

- [ ] WHEN ヘルスチェック失敗Issueが作成される際
      GIVEN 同一エンドポイント起因のOpenなIssueが既に存在する場合
      THEN 新規Issueは作成せず、既存Issueにコメントを追加する

- [ ] WHEN ヘルスチェックが正常に戻った際
      GIVEN 当該エンドポイントのOpenなIssueが存在する場合
      THEN 復旧コメントを追加する

## 関連Subtask

- [008-02-01: ヘルスチェック監視ワークフロー作成](./008-02-01-health-check-workflow.md)
- [008-02-02: 復旧検知・Issue自動更新](./008-02-02-recovery-detection.md)

## 備考

- ヘルスチェックエンドポイント（`GET /health`）は既に実装済み（200: ok, 503: degraded）
- API URLは `vars.API_BASE_URL` GitHub Variableで管理
- 月間GitHub Actions消費: 約720分（無料枠2,000分の36%）
