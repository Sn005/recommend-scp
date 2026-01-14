# Subtask-003-01-03: パイプライン実行管理テーブル

## 概要

パイプラインの実行履歴とリトライキューを管理するテーブルを作成する。
実行状況の追跡、チェックポイント機能、失敗時のリトライを実現する。

## ユーザーストーリー

**As a** 開発者/運用者
**I want** パイプライン実行履歴とリトライキューを管理する
**So that** 実行状況を追跡し、失敗時の再処理が容易になる

## Acceptance Criteria（EARS記法）

### パイプライン実行履歴テーブル

- [x] WHEN マイグレーションを実行した際
      GIVEN Supabaseに接続できる場合
      THEN `pipeline_runs` テーブルが作成される
      AND 以下のカラムが含まれる：- `id` (UUID, PRIMARY KEY) - `run_type` (TEXT): 'full_crawl', 'diff_crawl', 'embedding', 'tagging', 'full_pipeline' - `status` (TEXT): 'running', 'completed', 'failed', 'cancelled' - `started_at` (TIMESTAMPTZ) - `completed_at` (TIMESTAMPTZ) - `stats` (JSONB): 処理統計 - `error_message` (TEXT): エラー詳細 - `checkpoint` (JSONB): チェックポイント情報

- [x] WHEN パイプライン実行を開始した際
      GIVEN 正常に開始できる場合
      THEN `status: 'running'` でレコードが作成される
      AND `started_at` に現在時刻が設定される

- [x] WHEN パイプライン実行が完了した際
      GIVEN 処理が正常に完了した場合
      THEN `status` が 'completed' に更新される
      AND `completed_at` に現在時刻が設定される
      AND `stats` に処理件数等が記録される

### リトライキューテーブル

- [x] WHEN リトライキューテーブルを作成した際
      GIVEN Supabaseに接続できる場合
      THEN `retry_queue` テーブルが作成される
      AND 以下のカラムが含まれる：- `id` (SERIAL, PRIMARY KEY) - `article_id` (TEXT, FK to scp_articles) - `task_type` (TEXT): 'embedding', 'tagging' - `retry_count` (INTEGER): リトライ回数 - `max_retries` (INTEGER, DEFAULT 3): 最大リトライ回数 - `last_error` (TEXT): 最後のエラーメッセージ - `next_retry_at` (TIMESTAMPTZ): 次回リトライ予定日時 - `created_at` (TIMESTAMPTZ)
      AND `(article_id, task_type)` にユニーク制約がある

- [x] WHEN 処理が失敗した際
      GIVEN リトライ可能な場合
      THEN リトライキューにレコードが追加される
      AND `retry_count` が1増加する
      AND `next_retry_at` がエクスポネンシャルバックオフで設定される

- [x] WHEN 最大リトライ回数に達した際
      GIVEN `retry_count >= max_retries` の場合
      THEN それ以上リトライキューに追加されない
      AND 記事の `embedding_status` または `tagging_status` が 'error' に設定される

### チェックポイント機能

- [x] WHILE 大規模バッチ処理が実行中
      THE SYSTEM SHALL 100件ごとにチェックポイントを `pipeline_runs.checkpoint` に保存する
      AND 処理済みの最後の記事IDを記録する

- [x] WHEN 処理が中断から再開される際
      GIVEN チェックポイントが存在する場合
      THEN チェックポイント以降の記事から処理を再開する

## 設計

### pipeline_runs テーブル

```sql
CREATE TABLE pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL CHECK (run_type IN (
    'full_crawl', 'diff_crawl', 'embedding', 'tagging', 'full_pipeline'
  )),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
    'running', 'completed', 'failed', 'cancelled'
  )),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{}',
  error_message TEXT,
  checkpoint JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX idx_pipeline_runs_started_at ON pipeline_runs(started_at DESC);
```

### retry_queue テーブル

```sql
CREATE TABLE retry_queue (
  id SERIAL PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES scp_articles(id),
  task_type TEXT NOT NULL CHECK (task_type IN ('embedding', 'tagging')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, task_type)
);

CREATE INDEX idx_retry_queue_next_retry ON retry_queue(next_retry_at)
  WHERE next_retry_at IS NOT NULL;
CREATE INDEX idx_retry_queue_task_type ON retry_queue(task_type);
```

### stats JSONB 構造例

```json
{
  "totalArticles": 7000,
  "processed": 6950,
  "succeeded": 6900,
  "failed": 50,
  "skipped": 0,
  "totalTokens": 5600000,
  "estimatedCost": 10.5,
  "duration": 3600
}
```

### checkpoint JSONB 構造例

```json
{
  "phase": "embedding",
  "lastProcessedId": "SCP-3000",
  "processedCount": 3500,
  "timestamp": "2025-01-11T12:00:00Z"
}
```

## テストケース

- [x] `pipeline_runs` テーブルが正常に作成される
- [x] `retry_queue` テーブルが正常に作成される
- [x] パイプライン開始時にレコードが作成される
- [x] パイプライン完了時にステータスと統計が更新される
- [x] 失敗時にリトライキューにレコードが追加される
- [x] リトライ回数が正しくインクリメントされる
- [x] 最大リトライ回数超過時に追加されない
- [x] チェックポイントが正しく保存される
- [x] チェックポイントから処理を再開できる

## 実装状況

- **status**: completed
- **マイグレーションファイル**: `supabase/migrations/20250112000003_pipeline_tables.sql`
- **テストファイル**: `packages/pipeline/src/migrations/__dev__/003-01-03-pipeline-tables.test.ts`
