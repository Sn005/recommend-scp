-- ============================================
-- Subtask-003-01-01: 言語マスタ・記事テーブル拡張
-- ============================================
-- 多言語対応の基盤となる言語マスタテーブルを作成し、
-- 既存の記事テーブルに言語・処理ステータスフィールドを追加する。
-- ============================================

-- ============================================
-- 1. テスト用ヘルパー関数（スキーマ検証用）
-- ============================================

-- テーブルカラム情報取得
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  column_default TEXT,
  is_nullable TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.column_default::TEXT,
    c.is_nullable::TEXT
  FROM information_schema.columns c
  WHERE c.table_name = p_table_name
    AND c.table_schema = 'public';
END;
$$;

-- テーブルインデックス情報取得
CREATE OR REPLACE FUNCTION get_table_indexes(p_table_name TEXT)
RETURNS TABLE (
  index_name TEXT,
  index_definition TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.indexname::TEXT,
    i.indexdef::TEXT
  FROM pg_indexes i
  WHERE i.tablename = p_table_name
    AND i.schemaname = 'public';
END;
$$;

-- ============================================
-- 2. supported_languages テーブル作成
-- ============================================

CREATE TABLE IF NOT EXISTS supported_languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  wiki_url TEXT,
  crawler_type TEXT NOT NULL CHECK (crawler_type IN ('api', 'scraping')),
  is_active BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- コメント追加
COMMENT ON TABLE supported_languages IS '対応言語マスタテーブル';
COMMENT ON COLUMN supported_languages.code IS '言語コード（ISO 639-1）';
COMMENT ON COLUMN supported_languages.name IS '言語名';
COMMENT ON COLUMN supported_languages.wiki_url IS 'WikiのベースURL';
COMMENT ON COLUMN supported_languages.crawler_type IS 'クローラータイプ: api または scraping';
COMMENT ON COLUMN supported_languages.is_active IS '有効/無効フラグ';
COMMENT ON COLUMN supported_languages.priority IS '処理優先度（小さいほど優先）';

-- ============================================
-- 3. 初期データ投入
-- ============================================

INSERT INTO supported_languages (code, name, wiki_url, crawler_type, is_active, priority)
VALUES
  ('en', 'English', 'https://scp-wiki.wikidot.com', 'api', TRUE, 1),
  ('ja', '日本語', 'http://scp-jp.wikidot.com', 'scraping', FALSE, 2)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 4. scp_articles テーブル拡張
-- ============================================

-- 4.1 新カラム追加
ALTER TABLE scp_articles
  ADD COLUMN IF NOT EXISTS lang TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tagging_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMPTZ;

-- 4.2 CHECK制約追加（embedding_status）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scp_articles_embedding_status_check'
  ) THEN
    ALTER TABLE scp_articles
      ADD CONSTRAINT scp_articles_embedding_status_check
      CHECK (embedding_status IN ('pending', 'processing', 'completed', 'error'));
  END IF;
END $$;

-- 4.3 CHECK制約追加（tagging_status）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scp_articles_tagging_status_check'
  ) THEN
    ALTER TABLE scp_articles
      ADD CONSTRAINT scp_articles_tagging_status_check
      CHECK (tagging_status IN ('pending', 'processing', 'completed', 'error'));
  END IF;
END $$;

-- 4.4 外部キー制約追加（lang -> supported_languages.code）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scp_articles_lang_fkey'
  ) THEN
    ALTER TABLE scp_articles
      ADD CONSTRAINT scp_articles_lang_fkey
      FOREIGN KEY (lang) REFERENCES supported_languages(code);
  END IF;
END $$;

-- コメント追加
COMMENT ON COLUMN scp_articles.lang IS '言語コード（supported_languagesへの外部キー）';
COMMENT ON COLUMN scp_articles.source_updated_at IS 'ソース更新日時';
COMMENT ON COLUMN scp_articles.is_deleted IS '削除フラグ';
COMMENT ON COLUMN scp_articles.embedding_status IS 'Embedding処理状態: pending, processing, completed, error';
COMMENT ON COLUMN scp_articles.tagging_status IS 'タグ抽出処理状態: pending, processing, completed, error';
COMMENT ON COLUMN scp_articles.last_processed_at IS '最終処理日時';

-- ============================================
-- 5. 既存データのマイグレーション
-- ============================================

-- 5.1 全ての既存記事の lang を 'en' に設定
UPDATE scp_articles
SET lang = 'en'
WHERE lang IS NULL;

-- 5.2 embedding有の記事は embedding_status を 'completed' に設定
UPDATE scp_articles a
SET embedding_status = 'completed'
WHERE EXISTS (
  SELECT 1 FROM scp_embeddings e WHERE e.id = a.id
)
AND a.embedding_status = 'pending';

-- ============================================
-- 6. インデックス作成
-- ============================================

-- lang インデックス
CREATE INDEX IF NOT EXISTS idx_scp_articles_lang
  ON scp_articles(lang);

-- embedding_status インデックス
CREATE INDEX IF NOT EXISTS idx_scp_articles_embedding_status
  ON scp_articles(embedding_status);

-- tagging_status インデックス
CREATE INDEX IF NOT EXISTS idx_scp_articles_tagging_status
  ON scp_articles(tagging_status);

-- is_deleted 部分インデックス（削除されていない記事のみ）
CREATE INDEX IF NOT EXISTS idx_scp_articles_is_deleted
  ON scp_articles(is_deleted)
  WHERE is_deleted = FALSE;

-- ============================================
-- 検証クエリ（コメントアウト）
-- ============================================
--
-- supported_languages テーブル確認:
-- SELECT * FROM supported_languages;
--
-- scp_articles 新カラム確認:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'scp_articles'
-- AND column_name IN ('lang', 'source_updated_at', 'is_deleted', 'embedding_status', 'tagging_status', 'last_processed_at');
--
-- インデックス確認:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'scp_articles';
--
