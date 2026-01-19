-- ============================================
-- scp_articles に不足カラムを追加
-- ============================================
-- db-saver.ts が使用する fetched_at, tags カラムを追加
-- ============================================

-- fetched_at カラム追加
ALTER TABLE scp_articles
  ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ;

-- tags カラム追加（TEXT配列）
ALTER TABLE scp_articles
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- コメント追加
COMMENT ON COLUMN scp_articles.fetched_at IS 'クローラーによる取得日時';
COMMENT ON COLUMN scp_articles.tags IS 'Wikiから取得したタグ一覧';

-- ============================================
-- 検証クエリ（コメントアウト）
-- ============================================
--
-- カラム確認:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'scp_articles' AND column_name IN ('fetched_at', 'tags');
--
