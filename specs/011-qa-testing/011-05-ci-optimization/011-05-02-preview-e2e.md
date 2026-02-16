# Subtask 011-05-02: PRプレビューURL対向E2Eテスト

## 概要

PR作成時にVercelプレビューURLを取得し、プレビュー環境に対してE2Eテストを実行する。プレビューURL取得に失敗した場合はE2Eジョブをスキップする（ローカルビルドへのフォールバックは行わない）。

## 前提条件

- 011-05-01が完了していること（`PLAYWRIGHT_BASE_URL` 対応済み）
- Vercel GitHub App が有効であること

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: PRの段階でVercelプレビュー環境に対するE2Eテストを実行する
**価値**: マージ前にデプロイ環境での問題を早期発見できる
**理由**: 品質ゲートをできるだけ早い段階で適用し、本番障害を未然に防止する

## 受け入れ条件（EARS記法）

- [x] AC1: WHEN PRが作成/更新された際
      GIVEN Vercelプレビューデプロイが完了している場合
      THEN プレビューURLが取得される
      AND e2e ジョブがプレビューURLに対して実行される
      AND `PLAYWRIGHT_BASE_URL` にプレビューURLが設定される

- [x] AC2: WHEN プレビューURL取得ステップが実行された際
      GIVEN Vercelデプロイがまだ完了していない場合
      THEN デプロイ完了までポーリングで待機する（最大5分）
      AND タイムアウト時はe2eジョブをスキップする

- [x] AC3: WHEN プレビューURLの取得に失敗した際
      GIVEN ネットワークエラー、Vercel API障害、またはシークレット未設定の場合
      THEN e2eジョブがスキップされる
      AND CI全体は失敗にならない（ci ジョブは影響を受けない）

- [x] AC4: WHEN プレビューURL対向E2Eが実行される際
      GIVEN プレビューURLが正常に取得された場合
      THEN Build ステップはスキップされる
      AND `webServer` は起動しない
      AND @critical テストの失敗はマージをブロックする

## 設計

### VercelプレビューURL取得方式

#### 推奨: `zentered/vercel-preview-url` アクション

- Vercel APIを直接呼び出してプレビューURLを取得
- `pull_request` イベントで動作（`deployment_status` 不要）
- デプロイ状態もチェック可能

#### 必要なシークレット

| シークレット名      | 説明                        | 取得方法                          |
| ------------------- | --------------------------- | --------------------------------- |
| `VERCEL_TOKEN`      | Vercel APIアクセストークン  | Vercel Settings → Tokens          |
| `VERCEL_PROJECT_ID` | プロジェクトID（`prj_xxx`） | Vercel Project Settings → General |
| `VERCEL_TEAM_ID`    | チームID（チーム利用時）    | VercelダッシュボードURLから取得   |

### ci.yml の変更（011-05-01完了後のe2eジョブを拡張）

```yaml
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: ci
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: "20"
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Install Playwright Browsers
      run: pnpm --filter web exec playwright install --with-deps chromium

    # --- URL決定 ---
    - name: Get Vercel Preview URL
      if: github.event_name == 'pull_request'
      uses: zentered/vercel-preview-url@v1.1.9
      id: vercel_preview_url
      env:
        VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      with:
        vercel_project_id: ${{ secrets.VERCEL_PROJECT_ID }}
      continue-on-error: true

    - name: Wait for Preview Deployment
      if: github.event_name == 'pull_request' && steps.vercel_preview_url.outcome == 'success'
      id: wait_preview
      run: |
        PREVIEW_URL="https://${{ steps.vercel_preview_url.outputs.preview_url }}"
        echo "Waiting for $PREVIEW_URL to be ready..."
        for i in $(seq 1 30); do
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PREVIEW_URL" || true)
          if [ "$STATUS" = "200" ]; then
            echo "Preview is ready!"
            echo "ready=true" >> $GITHUB_OUTPUT
            exit 0
          fi
          echo "Attempt $i: status=$STATUS, waiting 10s..."
          sleep 10
        done
        echo "Preview URL not ready after 5 minutes"
        echo "ready=false" >> $GITHUB_OUTPUT
      continue-on-error: true

    - name: Set E2E Target URL
      id: e2e_target
      run: |
        if [ "${{ github.event_name }}" = "push" ]; then
          echo "url=${{ secrets.PRODUCTION_URL }}" >> $GITHUB_OUTPUT
          echo "skip=false" >> $GITHUB_OUTPUT
          echo "Using production URL"
        elif [ "${{ steps.vercel_preview_url.outcome }}" = "success" ] && \
             [ "${{ steps.wait_preview.outputs.ready }}" = "true" ]; then
          echo "url=https://${{ steps.vercel_preview_url.outputs.preview_url }}" >> $GITHUB_OUTPUT
          echo "skip=false" >> $GITHUB_OUTPUT
          echo "Using Vercel preview URL"
        else
          echo "url=" >> $GITHUB_OUTPUT
          echo "skip=true" >> $GITHUB_OUTPUT
          echo "Skipping E2E: no remote URL available"
        fi

    # --- E2E実行（リモートURLが取得できた場合のみ） ---
    - name: Run Critical E2E Tests
      if: steps.e2e_target.outputs.skip != 'true'
      run: pnpm --filter web test:e2e --grep @critical
      env:
        PLAYWRIGHT_BASE_URL: ${{ steps.e2e_target.outputs.url }}

    - name: Run Non-Critical E2E Tests
      if: steps.e2e_target.outputs.skip != 'true'
      run: pnpm --filter web test:e2e --grep-invert @critical
      continue-on-error: true
      env:
        PLAYWRIGHT_BASE_URL: ${{ steps.e2e_target.outputs.url }}

    - name: Upload Test Results
      uses: actions/upload-artifact@v4
      if: always() && steps.e2e_target.outputs.skip != 'true'
      with:
        name: playwright-report
        path: apps/web/e2e/playwright-report/
        retention-days: 7

    - name: E2E Skipped Notice
      if: steps.e2e_target.outputs.skip == 'true'
      run: echo "⚠️ E2E tests skipped: Vercel preview URL not available"
```

### フロー図

```
PR作成/更新:
  ┌─ Get Vercel Preview URL
  ├─ Wait for Preview Deployment
  │   ├─ 成功 → プレビューURL対向E2E
  │   └─ 失敗/タイムアウト → E2Eスキップ
  └─ CI結果（unit test/lintのみが品質ゲート）

mainプッシュ:
  └─ 本番URL対向E2E（PRODUCTION_URL シークレット）
```

### 変更の影響（011-05-01完了後との差分）

| トリガー     | ci ジョブ | e2e ジョブ         | 対象URL          | 変更         |
| ------------ | --------- | ------------------ | ---------------- | ------------ |
| PR to main   | 実行      | **プレビュー対向** | Vercelプレビュー | **変更あり** |
| PR (URL失敗) | 実行      | スキップ           | -                | 変更なし     |
| Push to main | 実行      | 本番URL対向        | 本番URL          | 変更なし     |

### リスク評価

| リスク                            | 影響度 | 発生頻度 | 対策                               |
| --------------------------------- | ------ | -------- | ---------------------------------- |
| `VERCEL_TOKEN` 未設定             | 低     | 極低     | E2Eスキップ、CIは失敗しない        |
| プレビューデプロイが5分以上かかる | 低     | 低       | E2Eスキップ、タイムアウト設定      |
| Vercel APIレート制限              | 低     | 極低     | ポーリング間隔10秒で負荷を抑制     |
| プレビューURLの形式変更           | 低     | 極低     | アクションのバージョン固定で安定化 |

## テストケース

- [x] PR時にVercelプレビューURLが取得される
- [x] PR時にプレビューURL対向でE2Eが実行される
- [x] プレビューURL取得失敗時にE2Eがスキップされる（ローカルビルドなし）
- [x] プレビューURL取得失敗時にCIが失敗しない
- [x] mainプッシュ時の本番URL対向E2Eに影響がない
- [x] `VERCEL_TOKEN` 未設定時にCIが失敗しない

## 実装状況

- **status**: completed

## 実装メモ

- 011-05-01完了後に着手すること
- `zentered/vercel-preview-url` のバージョンは `v1.1.9` で固定
- `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` はGitHub Secretsに登録が必要
- ローカルビルドへのフォールバックは行わない（URL取得失敗時はスキップ）
- 将来的にVercel CLIデプロイ方式に切り替えることも可能（より確実だが設定が複雑）
