---
id: "008-01"
epic_id: "008"
epic_title: "運用・監視"
title: "パイプライン失敗通知"
status: "completed"
created_at: "2026-02-15"
updated_at: "2026-02-15"
---

# Story: パイプライン失敗通知

## 親EPIC

[008: 運用・監視](../008-observability.md)

## ユーザーストーリー

**ペルソナ**: 開発者・運用者
**目的**: パイプラインジョブが失敗した際にGitHub Issueで即座に通知を受け取る
**価値**: 障害を早期発見し、データ鮮度の低下を防止できる
**理由**: メールだけでは見落とす可能性があり、Issue化することで対応追跡も可能にしたい

> 開発者・運用者として、パイプラインジョブが失敗した際にGitHub Issueで即座に通知を受け取りたい。なぜならメール通知だけでは見落とす可能性があり、Issueで対応追跡を可能にしたいから。

## Acceptance Criteria

- [x] WHEN データパイプラインGitHub Actionsワークフローが失敗した際
      THEN システムはGitHub Issueを自動作成する
      AND Issueにはエラー内容・失敗モード・ワークフロー実行URLが含まれる

- [x] WHEN パイプライン失敗Issueが作成される際
      GIVEN 同一ワークフロー起因のOpenなIssueが既に存在する場合
      THEN 新規Issueは作成せず、既存Issueにコメントを追加する

- [x] WHEN パイプライン失敗Issueが作成される際
      THEN `type:ops` および `pipeline:failure` ラベルが付与される

## 関連Subtask

- [008-01-01: パイプライン失敗時Issue自動起票](./008-01-01-pipeline-failure-issue.md)
- [008-01-02: 重複防止・ラベル管理](./008-01-02-dedup-and-labels.md)

## 備考

- 既存のメール通知（`dawidd6/action-send-mail`）は維持し、Issue起票を追加する
- `actions/github-script@v7` を使用（GITHUB_TOKEN自動提供）
