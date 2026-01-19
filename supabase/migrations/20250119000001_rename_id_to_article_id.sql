-- ============================================
-- scp_articles.id → article_id リネーム
-- ============================================
-- db-saver.ts が article_id カラムを使用しているため、
-- スキーマを合わせるマイグレーション。
-- 複合ユニークキー (article_id, lang) も追加。
-- ============================================

-- ============================================
-- 1. 外部キー制約を一時的に削除
-- ============================================

-- scp_embeddings の外部キー
ALTER TABLE scp_embeddings
  DROP CONSTRAINT IF EXISTS scp_embeddings_id_fkey;

-- article_tags の外部キー
ALTER TABLE article_tags
  DROP CONSTRAINT IF EXISTS article_tags_article_id_fkey;

-- retry_queue の外部キー（存在する場合）
ALTER TABLE retry_queue
  DROP CONSTRAINT IF EXISTS retry_queue_article_id_fkey;

-- ============================================
-- 2. scp_articles の id を article_id にリネーム
-- ============================================

-- プライマリキー制約を削除
ALTER TABLE scp_articles
  DROP CONSTRAINT IF EXISTS scp_articles_pkey;

-- カラム名を変更
ALTER TABLE scp_articles
  RENAME COLUMN id TO article_id;

-- ============================================
-- 3. 新しいプライマリキーと複合ユニークキーを作成
-- ============================================

-- サロゲートキーとして新しいidを追加
ALTER TABLE scp_articles
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- 新しいプライマリキー
ALTER TABLE scp_articles
  ADD CONSTRAINT scp_articles_pkey PRIMARY KEY (id);

-- 複合ユニークキー (article_id, lang)
ALTER TABLE scp_articles
  ADD CONSTRAINT scp_articles_article_id_lang_unique UNIQUE (article_id, lang);

-- ============================================
-- 4. scp_embeddings のスキーマ更新
-- ============================================

-- id カラムを article_id にリネーム
ALTER TABLE scp_embeddings
  RENAME COLUMN id TO article_id;

-- 外部キー制約を再作成（article_id を参照）
-- 注意: scp_articles の article_id はユニークではないため、
-- (article_id, lang) の組み合わせを参照する必要がある
-- ただし、scp_embeddings に lang カラムがないので、一旦外部キーは保留

-- ============================================
-- 5. article_tags のスキーマは変更不要
-- ============================================
-- article_tags.article_id はすでに article_id という名前

-- ============================================
-- 6. コメント追加
-- ============================================

COMMENT ON COLUMN scp_articles.article_id IS 'SCP記事ID（例: SCP-173）';
COMMENT ON COLUMN scp_articles.id IS 'サロゲートキー（UUID）';
COMMENT ON CONSTRAINT scp_articles_article_id_lang_unique ON scp_articles
  IS '記事ID + 言語の複合ユニークキー';

-- ============================================
-- 検証クエリ（コメントアウト）
-- ============================================
--
-- カラム確認:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'scp_articles';
--
-- 制約確認:
-- SELECT conname, contype FROM pg_constraint
-- WHERE conrelid = 'scp_articles'::regclass;
--
