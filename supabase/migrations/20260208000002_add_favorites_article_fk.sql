-- ============================================
-- favorites.article_id に scp_articles への外部キー制約を追加
-- ============================================
-- favoritesテーブルの article_id に FK制約がないため、
-- Supabase PostgREST の暗黙的JOIN（scp_articles(title, rating, tags)）が
-- リレーションシップを解決できず500エラーになる問題を修正。
-- ============================================

ALTER TABLE favorites
  ADD CONSTRAINT fk_favorites_article
  FOREIGN KEY (article_id)
  REFERENCES scp_articles(id)
  ON DELETE CASCADE;
