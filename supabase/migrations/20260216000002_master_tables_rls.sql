-- ============================================
-- 009-01-02: マスターデータテーブルRLS設定
-- ============================================
-- マスターデータ9テーブルにRow Level Securityを設定する。
-- SELECTは全ユーザーに許可し、INSERT/UPDATE/DELETEはservice_roleのみ許可する。
-- パターンはarticle_translationsの既存実装を踏襲。
-- 注意: article_translationsは既にRLS設定済みのためスキップ。
-- ============================================

-- ============================================
-- 1. scp_articles テーブル
-- ============================================

ALTER TABLE scp_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scp_articles_select"
  ON scp_articles
  FOR SELECT
  USING (true);

CREATE POLICY "scp_articles_insert"
  ON scp_articles
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "scp_articles_update"
  ON scp_articles
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "scp_articles_delete"
  ON scp_articles
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 2. scp_embeddings テーブル
-- ============================================

ALTER TABLE scp_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scp_embeddings_select"
  ON scp_embeddings
  FOR SELECT
  USING (true);

CREATE POLICY "scp_embeddings_insert"
  ON scp_embeddings
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "scp_embeddings_update"
  ON scp_embeddings
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "scp_embeddings_delete"
  ON scp_embeddings
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 3. tags テーブル
-- ============================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select"
  ON tags
  FOR SELECT
  USING (true);

CREATE POLICY "tags_insert"
  ON tags
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "tags_update"
  ON tags
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "tags_delete"
  ON tags
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 4. tag_dictionary テーブル
-- ============================================

ALTER TABLE tag_dictionary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tag_dictionary_select"
  ON tag_dictionary
  FOR SELECT
  USING (true);

CREATE POLICY "tag_dictionary_insert"
  ON tag_dictionary
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "tag_dictionary_update"
  ON tag_dictionary
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "tag_dictionary_delete"
  ON tag_dictionary
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 5. article_tags テーブル
-- ============================================

ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "article_tags_select"
  ON article_tags
  FOR SELECT
  USING (true);

CREATE POLICY "article_tags_insert"
  ON article_tags
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "article_tags_update"
  ON article_tags
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "article_tags_delete"
  ON article_tags
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 6. tag_localizations テーブル
-- ============================================

ALTER TABLE tag_localizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tag_localizations_select"
  ON tag_localizations
  FOR SELECT
  USING (true);

CREATE POLICY "tag_localizations_insert"
  ON tag_localizations
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "tag_localizations_update"
  ON tag_localizations
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "tag_localizations_delete"
  ON tag_localizations
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 7. supported_languages テーブル
-- ============================================

ALTER TABLE supported_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supported_languages_select"
  ON supported_languages
  FOR SELECT
  USING (true);

CREATE POLICY "supported_languages_insert"
  ON supported_languages
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "supported_languages_update"
  ON supported_languages
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "supported_languages_delete"
  ON supported_languages
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 8. pipeline_runs テーブル
-- ============================================

ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_runs_select"
  ON pipeline_runs
  FOR SELECT
  USING (true);

CREATE POLICY "pipeline_runs_insert"
  ON pipeline_runs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "pipeline_runs_update"
  ON pipeline_runs
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "pipeline_runs_delete"
  ON pipeline_runs
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 9. retry_queue テーブル
-- ============================================

ALTER TABLE retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retry_queue_select"
  ON retry_queue
  FOR SELECT
  USING (true);

CREATE POLICY "retry_queue_insert"
  ON retry_queue
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "retry_queue_update"
  ON retry_queue
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "retry_queue_delete"
  ON retry_queue
  FOR DELETE
  USING (auth.role() = 'service_role');
