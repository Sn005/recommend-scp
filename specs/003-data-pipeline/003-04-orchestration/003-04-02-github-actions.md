# Subtask-003-04-02: GitHub Actions定期実行

## 概要

GitHub Actionsを使用してパイプラインを定期実行するワークフローを作成する。
週次cron、手動トリガー、secrets管理を含む。

## ユーザーストーリー

**As a** 開発者/運用者
**I want** パイプラインを自動で定期実行する
**So that** 手動介入なしでデータを最新に保てる

## Acceptance Criteria（EARS記法）

### 定期実行

- [x] WHEN 週次スケジュールがトリガーされた際
      GIVEN 毎週日曜 3:00 JST（土曜 18:00 UTC）の場合
      THEN 差分クロールパイプラインが自動実行される

- [x] WHEN ワークフローが完了した際
      GIVEN 正常に完了した場合
      THEN 成功ステータスがGitHub上に表示される
      AND 実行ログが保存される

### 手動トリガー

- [x] WHEN 手動でワークフローを実行した際
      GIVEN workflow_dispatch が使用された場合
      THEN モード選択（diff/full/embedding/tagging）が可能
      AND ドライランオプションが選択可能

- [x] WHEN フルクロールモードが選択された際
      GIVEN `mode: 'full'` が指定された場合
      THEN フルクロールパイプラインが実行される

### Secrets管理

- [x] WHEN ワークフローが実行される際
      GIVEN 環境変数が必要な場合
      THEN GitHub Secretsから以下を取得する：- SUPABASE_URL - SUPABASE_SERVICE_ROLE_KEY - OPENAI_API_KEY - NOTIFY_EMAIL（通知用）

### タイムアウト

- [x] WHEN ワークフローが長時間実行された際
      GIVEN 60分を超過した場合
      THEN ジョブがタイムアウトする
      AND 失敗通知が送信される

### アーティファクト

- [x] WHEN ワークフローが完了した際
      GIVEN 実行ログがある場合
      THEN 実行ログをアーティファクトとして保存する
      AND 7日間保持する

## 設計

### ワークフロー定義

```yaml
# .github/workflows/data-pipeline.yml
name: Data Pipeline

on:
  schedule:
    # 毎週日曜 3:00 JST (土曜 18:00 UTC)
    - cron: "0 18 * * 6"

  workflow_dispatch:
    inputs:
      mode:
        description: "Pipeline mode"
        required: true
        default: "diff"
        type: choice
        options:
          - diff
          - full
          - embedding
          - tagging
      dry_run:
        description: "Dry run (no API calls)"
        type: boolean
        default: false
      cost_limit:
        description: "Cost limit in USD (optional)"
        type: string
        default: ""

env:
  NODE_VERSION: "20"

jobs:
  pipeline:
    name: Run Data Pipeline
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run pipeline
        id: pipeline
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          MODE="${{ inputs.mode || 'diff' }}"
          DRY_RUN="${{ inputs.dry_run && '--dry-run' || '' }}"
          COST_LIMIT="${{ inputs.cost_limit && format('--cost-limit={0}', inputs.cost_limit) || '' }}"

          pnpm --filter pipeline run \
            --mode=$MODE \
            $DRY_RUN \
            $COST_LIMIT \
            2>&1 | tee pipeline.log

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: pipeline-logs-${{ github.run_id }}
          path: pipeline.log
          retention-days: 7

      - name: Send success notification
        if: success()
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: ${{ secrets.MAIL_SERVER }}
          server_port: 587
          username: ${{ secrets.MAIL_USERNAME }}
          password: ${{ secrets.MAIL_PASSWORD }}
          subject: "[SCP Pipeline] Success - ${{ inputs.mode || 'diff' }}"
          to: ${{ secrets.NOTIFY_EMAIL }}
          from: noreply@scp-pipeline.example.com
          body: |
            Pipeline completed successfully!

            Mode: ${{ inputs.mode || 'diff' }}
            Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}

      - name: Send failure notification
        if: failure()
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: ${{ secrets.MAIL_SERVER }}
          server_port: 587
          username: ${{ secrets.MAIL_USERNAME }}
          password: ${{ secrets.MAIL_PASSWORD }}
          subject: "[SCP Pipeline] FAILED - ${{ inputs.mode || 'diff' }}"
          to: ${{ secrets.NOTIFY_EMAIL }}
          from: noreply@scp-pipeline.example.com
          body: |
            Pipeline failed!

            Mode: ${{ inputs.mode || 'diff' }}
            Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}

            Please check the logs for details.
```

### 必要なSecrets

| Secret名                    | 説明                       |
| --------------------------- | -------------------------- |
| `SUPABASE_URL`              | SupabaseプロジェクトのURL  |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseサービスロールキー |
| `OPENAI_API_KEY`            | OpenAI APIキー             |
| `MAIL_SERVER`               | SMTPサーバーアドレス       |
| `MAIL_USERNAME`             | SMTPユーザー名             |
| `MAIL_PASSWORD`             | SMTPパスワード             |
| `NOTIFY_EMAIL`              | 通知先メールアドレス       |

> 📖 各Secretの取得方法は [環境変数設定手順書](../../../packages/pipeline/docs/env-setup.md) を参照

## テストケース

- [x] cronスケジュールが正しく設定されている
- [x] 手動トリガーでモード選択ができる
- [x] ドライランオプションが機能する
- [x] Secretsから環境変数が正しく設定される
- [x] パイプラインコマンドが実行される
- [x] 実行ログがアーティファクトとして保存される
- [x] 成功時にメール通知が送信される
- [x] 失敗時にメール通知が送信される
- [x] 60分でタイムアウトする

## 実装状況

- **status**: completed
- **実装ファイル**:
  - `.github/workflows/data-pipeline.yml` - GitHub Actionsワークフロー
  - `packages/pipeline/scripts/run-pipeline.ts` - CLIエントリポイント
  - `packages/pipeline/package.json` - pipelineスクリプト追加
