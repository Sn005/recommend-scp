-- ============================================
-- 009-01-01: visitorデータテーブルRLS設定
-- ============================================
-- visitors関連5テーブルにRow Level Securityを設定する。
-- SELECTは全ユーザーに許可し、INSERT/UPDATE/DELETEはservice_roleのみ許可する。
-- パターンはarticle_translationsの既存実装を踏襲。
-- ============================================

-- ============================================
-- 1. visitors テーブル
-- ============================================

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitors_select"
  ON visitors
  FOR SELECT
  USING (true);

CREATE POLICY "visitors_insert"
  ON visitors
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "visitors_update"
  ON visitors
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "visitors_delete"
  ON visitors
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 2. view_history テーブル
-- ============================================

ALTER TABLE view_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_history_select"
  ON view_history
  FOR SELECT
  USING (true);

CREATE POLICY "view_history_insert"
  ON view_history
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "view_history_update"
  ON view_history
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "view_history_delete"
  ON view_history
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 3. feedback テーブル
-- ============================================

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_select"
  ON feedback
  FOR SELECT
  USING (true);

CREATE POLICY "feedback_insert"
  ON feedback
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "feedback_update"
  ON feedback
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "feedback_delete"
  ON feedback
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 4. recommendation_log テーブル
-- ============================================

ALTER TABLE recommendation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recommendation_log_select"
  ON recommendation_log
  FOR SELECT
  USING (true);

CREATE POLICY "recommendation_log_insert"
  ON recommendation_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "recommendation_log_update"
  ON recommendation_log
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "recommendation_log_delete"
  ON recommendation_log
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- 5. favorites テーブル
-- ============================================

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_select"
  ON favorites
  FOR SELECT
  USING (true);

CREATE POLICY "favorites_insert"
  ON favorites
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "favorites_update"
  ON favorites
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "favorites_delete"
  ON favorites
  FOR DELETE
  USING (auth.role() = 'service_role');
