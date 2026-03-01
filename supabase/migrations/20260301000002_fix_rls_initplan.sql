-- ============================================
-- RLS initplan最適化: auth.role() → (select auth.role())
-- ============================================
-- Supabase Performance Advisorの auth_rls_initplan 警告に対応。
-- auth.role() を直接呼ぶと各行ごとに再評価される（correlated subplan）。
-- (select auth.role()) でラップすると1回だけ評価し結果を使い回す（initplan）。
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ============================================
-- 対象: 15テーブル × 3ポリシー（INSERT/UPDATE/DELETE） = 45ポリシー
-- SELECT ポリシーは USING (true) のため変更不要。
-- ============================================

-- ============================================
-- 1. article_translations
-- ============================================

DROP POLICY IF EXISTS "article_translations_insert" ON article_translations;
CREATE POLICY "article_translations_insert"
  ON article_translations
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "article_translations_update" ON article_translations;
CREATE POLICY "article_translations_update"
  ON article_translations
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "article_translations_delete" ON article_translations;
CREATE POLICY "article_translations_delete"
  ON article_translations
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 2. visitors
-- ============================================

DROP POLICY IF EXISTS "visitors_insert" ON visitors;
CREATE POLICY "visitors_insert"
  ON visitors
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "visitors_update" ON visitors;
CREATE POLICY "visitors_update"
  ON visitors
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "visitors_delete" ON visitors;
CREATE POLICY "visitors_delete"
  ON visitors
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 3. view_history
-- ============================================

DROP POLICY IF EXISTS "view_history_insert" ON view_history;
CREATE POLICY "view_history_insert"
  ON view_history
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "view_history_update" ON view_history;
CREATE POLICY "view_history_update"
  ON view_history
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "view_history_delete" ON view_history;
CREATE POLICY "view_history_delete"
  ON view_history
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 4. feedback
-- ============================================

DROP POLICY IF EXISTS "feedback_insert" ON feedback;
CREATE POLICY "feedback_insert"
  ON feedback
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "feedback_update" ON feedback;
CREATE POLICY "feedback_update"
  ON feedback
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "feedback_delete" ON feedback;
CREATE POLICY "feedback_delete"
  ON feedback
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 5. recommendation_log
-- ============================================

DROP POLICY IF EXISTS "recommendation_log_insert" ON recommendation_log;
CREATE POLICY "recommendation_log_insert"
  ON recommendation_log
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "recommendation_log_update" ON recommendation_log;
CREATE POLICY "recommendation_log_update"
  ON recommendation_log
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "recommendation_log_delete" ON recommendation_log;
CREATE POLICY "recommendation_log_delete"
  ON recommendation_log
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 6. favorites
-- ============================================

DROP POLICY IF EXISTS "favorites_insert" ON favorites;
CREATE POLICY "favorites_insert"
  ON favorites
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "favorites_update" ON favorites;
CREATE POLICY "favorites_update"
  ON favorites
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "favorites_delete" ON favorites;
CREATE POLICY "favorites_delete"
  ON favorites
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 7. scp_articles
-- ============================================

DROP POLICY IF EXISTS "scp_articles_insert" ON scp_articles;
CREATE POLICY "scp_articles_insert"
  ON scp_articles
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "scp_articles_update" ON scp_articles;
CREATE POLICY "scp_articles_update"
  ON scp_articles
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "scp_articles_delete" ON scp_articles;
CREATE POLICY "scp_articles_delete"
  ON scp_articles
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 8. scp_embeddings
-- ============================================

DROP POLICY IF EXISTS "scp_embeddings_insert" ON scp_embeddings;
CREATE POLICY "scp_embeddings_insert"
  ON scp_embeddings
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "scp_embeddings_update" ON scp_embeddings;
CREATE POLICY "scp_embeddings_update"
  ON scp_embeddings
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "scp_embeddings_delete" ON scp_embeddings;
CREATE POLICY "scp_embeddings_delete"
  ON scp_embeddings
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 9. tags
-- ============================================

DROP POLICY IF EXISTS "tags_insert" ON tags;
CREATE POLICY "tags_insert"
  ON tags
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "tags_update" ON tags;
CREATE POLICY "tags_update"
  ON tags
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "tags_delete" ON tags;
CREATE POLICY "tags_delete"
  ON tags
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 10. tag_dictionary
-- ============================================

DROP POLICY IF EXISTS "tag_dictionary_insert" ON tag_dictionary;
CREATE POLICY "tag_dictionary_insert"
  ON tag_dictionary
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "tag_dictionary_update" ON tag_dictionary;
CREATE POLICY "tag_dictionary_update"
  ON tag_dictionary
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "tag_dictionary_delete" ON tag_dictionary;
CREATE POLICY "tag_dictionary_delete"
  ON tag_dictionary
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 11. article_tags
-- ============================================

DROP POLICY IF EXISTS "article_tags_insert" ON article_tags;
CREATE POLICY "article_tags_insert"
  ON article_tags
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "article_tags_update" ON article_tags;
CREATE POLICY "article_tags_update"
  ON article_tags
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "article_tags_delete" ON article_tags;
CREATE POLICY "article_tags_delete"
  ON article_tags
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 12. tag_localizations
-- ============================================

DROP POLICY IF EXISTS "tag_localizations_insert" ON tag_localizations;
CREATE POLICY "tag_localizations_insert"
  ON tag_localizations
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "tag_localizations_update" ON tag_localizations;
CREATE POLICY "tag_localizations_update"
  ON tag_localizations
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "tag_localizations_delete" ON tag_localizations;
CREATE POLICY "tag_localizations_delete"
  ON tag_localizations
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 13. supported_languages
-- ============================================

DROP POLICY IF EXISTS "supported_languages_insert" ON supported_languages;
CREATE POLICY "supported_languages_insert"
  ON supported_languages
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "supported_languages_update" ON supported_languages;
CREATE POLICY "supported_languages_update"
  ON supported_languages
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "supported_languages_delete" ON supported_languages;
CREATE POLICY "supported_languages_delete"
  ON supported_languages
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 14. pipeline_runs
-- ============================================

DROP POLICY IF EXISTS "pipeline_runs_insert" ON pipeline_runs;
CREATE POLICY "pipeline_runs_insert"
  ON pipeline_runs
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "pipeline_runs_update" ON pipeline_runs;
CREATE POLICY "pipeline_runs_update"
  ON pipeline_runs
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "pipeline_runs_delete" ON pipeline_runs;
CREATE POLICY "pipeline_runs_delete"
  ON pipeline_runs
  FOR DELETE
  USING ((select auth.role()) = 'service_role');

-- ============================================
-- 15. retry_queue
-- ============================================

DROP POLICY IF EXISTS "retry_queue_insert" ON retry_queue;
CREATE POLICY "retry_queue_insert"
  ON retry_queue
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "retry_queue_update" ON retry_queue;
CREATE POLICY "retry_queue_update"
  ON retry_queue
  FOR UPDATE
  USING ((select auth.role()) = 'service_role');

DROP POLICY IF EXISTS "retry_queue_delete" ON retry_queue;
CREATE POLICY "retry_queue_delete"
  ON retry_queue
  FOR DELETE
  USING ((select auth.role()) = 'service_role');
