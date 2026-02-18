---
id: "008-01-01"
epic_id: "008"
story_id: "008-01"
epic_title: "運用・監視"
story_title: "パイプライン失敗通知"
title: "パイプライン失敗時Issue自動起票"
status: "completed"
created_at: "2026-02-15"
updated_at: "2026-02-15"
completed_at: null
---

# Subtask: パイプライン失敗時Issue自動起票

## 親Story

[008-01: パイプライン失敗通知](./008-01-pipeline-notification.md)

## ユーザーストーリー

**ペルソナ**: 開発者・運用者
**目的**: パイプラインが失敗した際に自動でGitHub Issueが作成される仕組みを構築する
**価値**: 障害発生を確実にキャッチし、対応漏れを防止できる
**理由**: メール通知だけでは対応追跡が困難で、Issue化による可視化が必要

> 開発者・運用者として、パイプラインが失敗した際に自動でGitHub Issueが作成される仕組みを構築したい。なぜならメール通知だけでは対応追跡が困難で、Issue化により可視化・追跡を可能にしたいから。

## Acceptance Criteria

- [x] WHEN データパイプラインGitHub Actionsワークフローが失敗した際
      THEN `actions/github-script@v7` ステップが実行される
      AND GitHub Issueが自動作成される

- [x] WHEN 失敗Issueが作成される際
      THEN Issueタイトルに失敗モード（diff/full/embedding/tagging）が含まれる
      AND Issue本文にワークフロー実行URL（`github.server_url/.../runs/run_id`）が含まれる
      AND Issue本文にタイムスタンプ（UTC）が含まれる

- [x] WHEN 失敗Issueが作成される際
      THEN `type:ops` および `pipeline:failure` ラベルが付与される

## 設計

### 変更対象ファイル

- `.github/workflows/data-pipeline.yml`（既存ファイルにステップ追加）

### 追加ステップ概要

```yaml
- name: Create failure issue
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      const mode = '${{ inputs.mode || 'diff' }}';
      const runUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;

      await github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: `[Pipeline] 失敗 - ${mode}モード`,
        body: [
          `## パイプライン失敗レポート`,
          ``,
          `| 項目 | 値 |`,
          `| --- | --- |`,
          `| モード | ${mode} |`,
          `| 実行URL | ${runUrl} |`,
          `| 発生時刻 | ${new Date().toISOString()} |`,
          ``,
          `### 対応手順`,
          `1. [ワークフロー実行ログ](${runUrl})を確認`,
          `2. エラー内容を特定`,
          `3. 必要に応じて手動再実行`,
        ].join('\n'),
        labels: ['type:ops', 'pipeline:failure']
      });
```

### 技術的考慮事項

- `actions/github-script@v7` は `GITHUB_TOKEN` が自動的に提供されるため、追加のシークレット設定不要
- `if: failure()` 条件により、パイプラインが失敗した場合のみ実行
- 既存のメール通知ステップは維持（影響なし）
- ラベルは事前にリポジトリに作成しておく必要がある

## 前提条件

- `type:ops` および `pipeline:failure` ラベルがリポジトリに事前作成されていること
- 本Subtaskはシンプル版（重複防止なし）を実装する。重複防止は 008-01-02 で追加する

## テストケース

```yaml
# 手動テスト手順
# 1. SUPABASE_URL シークレットを一時的に無効値に変更し、workflow_dispatchで実行
# 2. パイプライン失敗後、GitHub Issueが作成されることを確認
# 3. Issueタイトルにモード名（例: diff）が含まれることを確認
# 4. Issue本文にワークフロー実行URLが含まれることを確認
# 5. type:ops, pipeline:failure ラベルが付与されていることを確認
# 6. シークレットを正しい値に戻す
```

## 実装状況

- **status**: completed

## 完了確認

- 確認日: 2026-02-18
- 確認者: Claude
- 備考: data-pipeline.ymlにgithub-scriptステップを追加

## 参照ドキュメント

- [ワークフロー定義](../../../.ai/WORKFLOW.md)
- 既存ワークフロー: `.github/workflows/data-pipeline.yml`
