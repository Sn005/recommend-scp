-- ============================================
-- article_id を小文字に統一 + CHECK制約で再発防止
-- ============================================
-- DBの scp_articles.article_id に大文字（例: SCP-2000）と小文字（例: scp-173）が
-- 混在しており、Wikidotの printer--friendly/ エンドポイントが小文字スラッグでないと
-- 正常動作しない問題の根本修正。
--
-- 修正内容:
--   1. favorites FK制約を一旦削除（ON UPDATE CASCADEがないため）
--   2. 全9テーブルの article_id を LOWER() で正規化
--   3. favorites FK制約を ON DELETE CASCADE ON UPDATE CASCADE 付きで再作成
--   4. scp_articles に CHECK制約追加（小文字のみ許可）
-- ============================================

BEGIN;

-- ============================================
-- 1. favorites FK制約を一旦削除
-- ============================================
ALTER TABLE favorites
  DROP CONSTRAINT IF EXISTS fk_favorites_article;

-- ============================================
-- 2. 全9テーブルの article_id を LOWER() で正規化
-- ============================================

UPDATE scp_articles
  SET article_id = LOWER(article_id)
  WHERE article_id != LOWER(article_id);

UPDATE scp_embeddings
  SET article_id = LOWER(article_id)
  WHERE article_id != LOWER(article_id);

UPDATE article_tags
  SET article_id = LOWER(article_id)
  WHERE article_id != LOWER(article_id);

UPDATE retry_queue
  SET article_id = LOWER(article_id)
  WHERE article_id != LOWER(article_id);

UPDATE view_history
  SET article_id = LOWER(article_id)
  WHERE article_id != LOWER(article_id);

UPDATE feedback
  SET article_id = LOWER(article_id)
  WHERE article_id != LOWER(article_id);

UPDATE recommendation_log
  SET article_id = LOWER(article_id)
  WHERE article_id != LOWER(article_id);

UPDATE favorites
  SET article_id = LOWER(article_id)
  WHERE article_id != LOWER(article_id);

UPDATE article_translations
  SET article_id = LOWER(article_id)
  WHERE article_id != LOWER(article_id);

-- ============================================
-- 3. favorites FK制約を ON UPDATE CASCADE 付きで再作成
-- ============================================
ALTER TABLE favorites
  ADD CONSTRAINT fk_favorites_article
  FOREIGN KEY (article_id)
  REFERENCES scp_articles(article_id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- ============================================
-- 4. scp_articles に CHECK制約追加（小文字のみ許可）
-- ============================================
ALTER TABLE scp_articles
  ADD CONSTRAINT chk_article_id_lowercase
  CHECK (article_id = LOWER(article_id));

COMMIT;
