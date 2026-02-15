---
id: "008-02-02"
epic_id: "008"
story_id: "008-02"
epic_title: "運用・監視"
story_title: "ヘルスチェック定期監視"
title: "復旧検知・Issue自動更新"
status: "pending"
created_at: "2026-02-15"
updated_at: "2026-02-15"
completed_at: null
---

# Subtask: 復旧検知・Issue自動更新

## 親Story

[008-02: ヘルスチェック定期監視](./008-02-health-check-monitor.md)

## ユーザーストーリー

**ペルソナ**: 開発者・運用者
**目的**: サービスが復旧した際にIssueへ自動で復旧コメントを追加する
**価値**: 復旧タイミングを正確に記録し、対応完了の判断材料にできる
**理由**: 手動でIssueを更新する手間を省き、正確な復旧時刻を記録したい

> 開発者・運用者として、サービスが復旧した際にIssueへ自動で復旧コメントが追加されることを望む。なぜなら手動更新の手間を省き、正確な復旧時刻を記録したいから。

## Acceptance Criteria

- [ ] WHEN ヘルスチェックが正常（HTTP 200）を返した際
      GIVEN `health:degraded` ラベル付きのOpenなIssueが存在する場合
      THEN 既存Issueに復旧コメントを追加する
      AND コメントには復旧時刻が含まれる

- [ ] WHEN ヘルスチェックが正常（HTTP 200）を返した際
      GIVEN `health:degraded` ラベル付きのOpenなIssueが存在しない場合
      THEN 何も行わない（正常動作）

## 設計

### 変更対象ファイル

- `.github/workflows/health-check.yml`（008-02-01で作成したワークフローにステップ追加）

### 復旧検知ステップ

```yaml
- name: Handle recovery
  if: steps.health.outputs.status_code == '200'
  uses: actions/github-script@v7
  with:
    script: |
      const timestamp = new Date().toISOString();

      // health:degraded ラベル付きのOpenなIssueを検索
      const { data: existingIssues } = await github.rest.issues.listForRepo({
        owner: context.repo.owner,
        repo: context.repo.repo,
        labels: 'type:ops,health:degraded',
        state: 'open',
        per_page: 1
      });

      if (existingIssues.length > 0) {
        await github.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: existingIssues[0].number,
          body: [
            `## 復旧確認`,
            ``,
            `ヘルスチェックが正常に戻りました。`,
            ``,
            `| 項目 | 値 |`,
            `| --- | --- |`,
            `| 復旧時刻 | ${timestamp} |`,
            `| ステータス | 正常 (HTTP 200) |`,
            ``,
            `> このIssueは手動でクローズしてください。`,
          ].join('\n')
        });
        core.info(`Issue #${existingIssues[0].number} に復旧コメントを追加しました`);
      }
```

### 技術的考慮事項

- 復旧コメントは追加するが、Issueの自動クローズは行わない（運用者が確認後に手動クローズ）
- `if: steps.health.outputs.status_code == '200'` で正常時のみ実行
- Open Issueが存在しない場合は何もしない（不要なAPI呼び出しは発生するが、シンプルさを優先）
- 復旧判定は1回のHTTP 200成功で即座に実施（将来的には「連続N回成功」への拡張を検討）

## テストケース

```yaml
# 手動テスト手順
# 1. 事前にhealth:degraded Issueが存在する状態を作る
#    （vars.API_BASE_URLを無効にして手動実行 → Issueが作成される）
# 2. vars.API_BASE_URL を正しいURLに戻す
# 3. workflow_dispatch で手動実行
# 4. 既存Issueに「復旧確認」コメントが追加されることを確認
# 5. コメントに復旧時刻が含まれることを確認
# 6. Issueが自動クローズされていないことを確認（手動クローズ方針）
```

## 完了確認

- 確認日:
- 確認者:
- 備考:

## 参照ドキュメント

- [ワークフロー定義](../../../.ai/WORKFLOW.md)
- ヘルスチェック実装: `apps/api-server/src/routes/health.ts`
