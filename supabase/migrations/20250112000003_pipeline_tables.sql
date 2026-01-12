-- ============================================
-- Subtask-003-01-03: パイプライン実行管理テーブル
-- ============================================
-- パイプラインの実行履歴とリトライキューを管理するテーブルを作成する。
-- 実行状況の追跡、チェックポイント機能、失敗時のリトライを実現する。
-- ============================================

-- ============================================
-- 1. pipeline_runs テーブル作成
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_runs (
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

-- コメント追加
COMMENT ON TABLE pipeline_runs IS 'パイプライン実行履歴テーブル';
COMMENT ON COLUMN pipeline_runs.id IS '実行ID（UUID）';
COMMENT ON COLUMN pipeline_runs.run_type IS 'パイプラインタイプ: full_crawl, diff_crawl, embedding, tagging, full_pipeline';
COMMENT ON COLUMN pipeline_runs.status IS '実行状態: running, completed, failed, cancelled';
COMMENT ON COLUMN pipeline_runs.started_at IS '実行開始日時';
COMMENT ON COLUMN pipeline_runs.completed_at IS '実行完了日時';
COMMENT ON COLUMN pipeline_runs.stats IS '処理統計（JSONB）';
COMMENT ON COLUMN pipeline_runs.error_message IS 'エラー詳細';
COMMENT ON COLUMN pipeline_runs.checkpoint IS 'チェックポイント情報（JSONB）';
COMMENT ON COLUMN pipeline_runs.created_at IS 'レコード作成日時';

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started_at ON pipeline_runs(started_at DESC);

-- ============================================
-- 2. retry_queue テーブル作成
-- ============================================

CREATE TABLE IF NOT EXISTS retry_queue (
  id SERIAL PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES scp_articles(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('embedding', 'tagging')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, task_type)
);

-- コメント追加
COMMENT ON TABLE retry_queue IS 'リトライキューテーブル';
COMMENT ON COLUMN retry_queue.id IS 'リトライID（SERIAL）';
COMMENT ON COLUMN retry_queue.article_id IS '記事ID（scp_articlesへの外部キー）';
COMMENT ON COLUMN retry_queue.task_type IS 'タスクタイプ: embedding, tagging';
COMMENT ON COLUMN retry_queue.retry_count IS 'リトライ回数';
COMMENT ON COLUMN retry_queue.max_retries IS '最大リトライ回数（デフォルト: 3）';
COMMENT ON COLUMN retry_queue.last_error IS '最後のエラーメッセージ';
COMMENT ON COLUMN retry_queue.next_retry_at IS '次回リトライ予定日時';
COMMENT ON COLUMN retry_queue.created_at IS 'レコード作成日時';

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_retry_queue_next_retry ON retry_queue(next_retry_at)
  WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retry_queue_task_type ON retry_queue(task_type);

-- ============================================
-- 検証クエリ（コメントアウト）
-- ============================================
--
-- pipeline_runs テーブル確認:
-- SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 10;
--
-- retry_queue テーブル確認:
-- SELECT * FROM retry_queue ORDER BY next_retry_at ASC;
--
-- インデックス確認:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('pipeline_runs', 'retry_queue');
--
-- パイプライン実行開始例:
-- INSERT INTO pipeline_runs (run_type) VALUES ('full_crawl') RETURNING id;
--
-- パイプライン完了更新例:
-- UPDATE pipeline_runs
-- SET status = 'completed',
--     completed_at = NOW(),
--     stats = '{"totalArticles": 7000, "processed": 6950}'::jsonb
-- WHERE id = 'xxx';
--
-- リトライキュー追加例:
-- INSERT INTO retry_queue (article_id, task_type, last_error, next_retry_at)
-- VALUES ('scp-001', 'embedding', 'Rate limit exceeded', NOW() + INTERVAL '1 hour');
--
-- リトライ回数インクリメント例:
-- UPDATE retry_queue
-- SET retry_count = retry_count + 1,
--     last_error = 'API timeout',
--     next_retry_at = NOW() + (INTERVAL '1 hour' * POWER(2, retry_count))
-- WHERE article_id = 'scp-001' AND task_type = 'embedding';
--
