---
id: "008-02-01"
epic_id: "008"
story_id: "008-02"
epic_title: "運用・監視"
story_title: "ヘルスチェック定期監視"
title: "ヘルスチェック監視ワークフロー作成"
status: "pending"
created_at: "2026-02-15"
updated_at: "2026-02-15"
completed_at: null
---

# Subtask: ヘルスチェック監視ワークフロー作成

## 親Story

[008-02: ヘルスチェック定期監視](./008-02-health-check-monitor.md)

## ユーザーストーリー

**ペルソナ**: 開発者・運用者
**目的**: GitHub Actions cronでAPIサーバーのヘルスチェックを1時間おきに自動実行する
**価値**: サービスダウンを最大1時間以内に検知できる
**理由**: 外部監視SaaSなしで定期的な外形監視を実現したい

> 開発者・運用者として、GitHub Actions cronでAPIサーバーのヘルスチェックを1時間おきに自動実行したい。なぜなら外部監視SaaSなしでサービスダウンを最大1時間以内に検知したいから。

## Acceptance Criteria

- [ ] WHILE GitHub Actions cronワークフローが稼働中
      THE SYSTEM SHALL 毎時0分にヘルスチェックエンドポイントを `curl` で呼び出す
      AND タイムアウトは30秒とする

- [ ] WHEN ヘルスチェックのHTTPステータスが200以外（503, タイムアウト, 接続エラー等）の場合
      THEN `actions/github-script@v7` でGitHub Issueを自動作成する
      AND Issueにはレスポンスステータスコード・タイムスタンプ・エンドポイントURLが含まれる
      AND `type:ops` および `health:degraded` ラベルが付与される

- [ ] WHEN ヘルスチェック失敗Issueを作成する前に
      GIVEN `health:degraded` ラベル付きのOpenなIssueが既に存在する場合
      THEN 新規Issueは作成せず、既存Issueにコメントを追加する

- [ ] WHEN `workflow_dispatch` で手動実行した場合
      THEN 通常のcron実行と同じ動作をする（テスト用）

## 設計

### 新規作成ファイル

- `.github/workflows/health-check.yml`

### ワークフロー構成

```yaml
name: Health Check Monitor

on:
  schedule:
    - cron: "0 * * * *" # 毎時0分（UTC）
  workflow_dispatch: {} # 手動テスト用

jobs:
  health-check:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Check health endpoint
        id: health
        run: |
          STATUS_CODE=$(curl -s -o /tmp/health.json -w "%{http_code}" \
            --max-time 30 \
            "${{ vars.API_BASE_URL }}/health" 2>/dev/null || echo "000")
          echo "status_code=$STATUS_CODE" >> $GITHUB_OUTPUT

          if [ -f /tmp/health.json ]; then
            BODY=$(cat /tmp/health.json)
            echo "response_body=$BODY" >> $GITHUB_OUTPUT
          fi

          echo "ヘルスチェック結果: HTTP $STATUS_CODE"

      - name: Handle unhealthy status
        if: steps.health.outputs.status_code != '200'
        uses: actions/github-script@v7
        with:
          script: |
            const statusCode = '${{ steps.health.outputs.status_code }}';
            const apiUrl = '${{ vars.API_BASE_URL }}/health';
            const timestamp = new Date().toISOString();

            // 重複チェック
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
                  `## 継続障害報告`,
                  ``,
                  `| 項目 | 値 |`,
                  `| --- | --- |`,
                  `| ステータスコード | ${statusCode} |`,
                  `| エンドポイント | ${apiUrl} |`,
                  `| 検知時刻 | ${timestamp} |`,
                ].join('\n')
              });
            } else {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `[Health Check] API障害検知 - HTTP ${statusCode}`,
                body: [
                  `## ヘルスチェック障害レポート`,
                  ``,
                  `| 項目 | 値 |`,
                  `| --- | --- |`,
                  `| ステータスコード | ${statusCode} |`,
                  `| エンドポイント | ${apiUrl} |`,
                  `| 検知時刻 | ${timestamp} |`,
                  ``,
                  `### 対応手順`,
                  `1. Vercelダッシュボードでデプロイ状態を確認`,
                  `2. \`/health\` エンドポイントに手動アクセスして状態確認`,
                  `3. SupabaseダッシュボードでDB状態を確認`,
                  `4. 必要に応じて再デプロイ`,
                ].join('\n'),
                labels: ['type:ops', 'health:degraded']
              });
            }
```

### 技術的考慮事項

- `vars.API_BASE_URL` はGitHub Repository Variablesで設定（例: `https://api.example.com`）
- `timeout-minutes: 5` でジョブ全体のタイムアウトを短く設定（Actions消費量を最小化）
- `curl --max-time 30` でHTTPリクエストのタイムアウトを30秒に設定
- ステータスコード `000` は接続エラー/タイムアウトを示す
- 月間消費量: 約720分（24時間 x 30日、各実行約1分）

## テストケース

```yaml
# 手動テスト手順
# 1. vars.API_BASE_URL を正しいURLに設定
# 2. workflow_dispatch で手動実行し、正常完了を確認
# 3. vars.API_BASE_URL を無効なURLに一時変更
# 4. workflow_dispatch で手動実行し、Issue が作成されることを確認
# 5. 再度手動実行し、既存Issueにコメントが追加されることを確認
# 6. vars.API_BASE_URL を正しいURLに戻す
```

## 完了確認

- 確認日:
- 確認者:
- 備考:

## 参照ドキュメント

- [ワークフロー定義](../../../.ai/WORKFLOW.md)
- ヘルスチェック実装: `apps/api-server/src/routes/health.ts`
