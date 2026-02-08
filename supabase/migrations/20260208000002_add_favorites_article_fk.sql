-- ============================================
-- favorites.article_id に scp_articles への外部キー制約を追加
-- ============================================
-- favoritesテーブルの article_id に FK制約がないため、
-- Supabase PostgREST の暗黙的JOIN（scp_articles(title, rating, tags)）が
-- リレーションシップを解決できず500エラーになる問題を修正。
--
-- 前提:
--   scp_articles.id は UUID サロゲートキー（20250119000001 で変更済み）
--   scp_articles.article_id が実際の記事ID（TEXT, 例: "SCP-173"）
--   favorites.article_id は TEXT で記事IDを保持
--
-- 修正内容:
--   1. scp_articles.article_id に単独 UNIQUE 制約を追加（FK参照に必要）
--   2. FK参照先を scp_articles(id) [UUID] → scp_articles(article_id) [TEXT] に修正
-- ============================================

-- 1. scp_articles.article_id に単独 UNIQUE 制約を追加
-- （既存の複合ユニーク (article_id, lang) だけではFK参照先にできないため）
ALTER TABLE scp_articles
  ADD CONSTRAINT scp_articles_article_id_unique UNIQUE (article_id);

-- 2. favorites.article_id → scp_articles.article_id への FK 制約を追加
ALTER TABLE favorites
  ADD CONSTRAINT fk_favorites_article
  FOREIGN KEY (article_id)
  REFERENCES scp_articles(article_id)
  ON DELETE CASCADE;
