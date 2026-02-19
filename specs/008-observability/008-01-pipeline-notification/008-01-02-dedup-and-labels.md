---
id: "008-01-02"
epic_id: "008"
story_id: "008-01"
epic_title: "運用・監視"
story_title: "パイプライン失敗通知"
title: "重複防止・ラベル管理"
status: "completed"
created_at: "2026-02-15"
updated_at: "2026-02-15"
completed_at: null
---

# Subtask: 重複防止・ラベル管理

## 親Story

[008-01: パイプライン失敗通知](./008-01-pipeline-notification.md)

## ユーザーストーリー

**ペルソナ**: 開発者・運用者
**目的**: 同一原因のパイプライン失敗で重複Issueが作成されるのを防止する
**価値**: Issue一覧がノイズで埋もれず、対応状況を正確に把握できる
**理由**: 毎週のcron実行で同じエラーが続くと大量の重複Issueが生まれてしまう

> 開発者・運用者として、同一原因のパイプライン失敗で重複Issueが作成されるのを防止したい。なぜなら毎週のcron実行で同じエラーが続くと大量の重複Issueが生まれ、対応状況の把握が困難になるから。

## Acceptance Criteria

- [x] WHEN パイプライン失敗Issueを作成する前に
      THEN `pipeline:failure` ラベル付きのOpenなIssueが検索される

- [x] WHEN 同一ラベルのOpenなIssueが存在する場合
      GIVEN パイプラインが再び失敗した場合
      THEN 新規Issueは作成せず、既存Issueにコメントを追加する
      AND コメントには失敗時刻・モード・ワークフロー実行URLが含まれる

- [x] WHEN 同一ラベルのOpenなIssueが存在しない場合
      GIVEN パイプラインが失敗した場合
      THEN 新規Issueを作成する（008-01-01の仕様通り）

## 設計

### 変更対象ファイル

- `.github/workflows/data-pipeline.yml`（008-01-01で追加したステップを拡張）

### 重複防止ロジック

```yaml
- name: Create or update failure issue
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      const mode = '${{ inputs.mode || 'diff' }}';
      const runUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
      const timestamp = new Date().toISOString();

      // 重複チェック: pipeline:failure ラベル付きOpenなIssueを検索
      const { data: existingIssues } = await github.rest.issues.listForRepo({
        owner: context.repo.owner,
        repo: context.repo.repo,
        labels: 'type:ops,pipeline:failure',
        state: 'open',
        per_page: 1
      });

      if (existingIssues.length > 0) {
        // 既存Issueにコメント追加
        await github.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: existingIssues[0].number,
          body: [
            `## 再発報告`,
            ``,
            `| 項目 | 値 |`,
            `| --- | --- |`,
            `| モード | ${mode} |`,
            `| 実行URL | ${runUrl} |`,
            `| 発生時刻 | ${timestamp} |`,
          ].join('\n')
        });
        core.info(`既存Issue #${existingIssues[0].number} にコメントを追加しました`);
      } else {
        // 新規Issue作成
        const { data: issue } = await github.rest.issues.create({
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
            `| 発生時刻 | ${timestamp} |`,
            ``,
            `### 対応手順`,
            `1. [ワークフロー実行ログ](${runUrl})を確認`,
            `2. エラー内容を特定`,
            `3. 必要に応じて手動再実行`,
            `4. 対応完了後、このIssueをクローズ`,
          ].join('\n'),
          labels: ['type:ops', 'pipeline:failure']
        });
        core.info(`Issue #${issue.number} を作成しました`);
      }
```

### 技術的考慮事項

- `listForRepo` の `per_page: 1` で最新の1件のみ取得（効率化）
- ラベルベースの検索は文字列マッチより信頼性が高い
- 008-01-01のステップを本Subtaskで拡張（最終的に1つのステップに統合）

## テストケース

```yaml
# 手動テスト手順
# 1. パイプラインを意図的に失敗させ、Issueが作成されることを確認
# 2. Issueをクローズせずに、再度パイプラインを失敗させる
# 3. 新規Issueが作成されず、既存Issueにコメントが追加されることを確認
# 4. コメントにモード・実行URL・タイムスタンプが含まれることを確認
# 5. Issueをクローズ後、再度失敗させ、新規Issueが作成されることを確認
```

## 実装状況

- **status**: completed

## 完了確認

- 確認日: 2026-02-18
- 確認者: Claude
- 備考: 008-01-01のステップを重複防止ロジックに拡張

## 参照ドキュメント

- [ワークフロー定義](../../../.ai/WORKFLOW.md)
- 既存ワークフロー: `.github/workflows/data-pipeline.yml`
