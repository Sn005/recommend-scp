-- ============================================
-- 005-02-01: visitors関連テーブルのマイグレーション
-- ============================================
-- visitors, view_history, feedback, recommendation_log, favorites テーブルを作成
-- 推薦ロジックのデータを永続化するための基盤
-- ============================================

-- ============================================
-- 1. visitorsテーブル
-- ============================================
-- ユーザー嗜好データを保存するメインテーブル

CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  preference_vector vector(1536),
  tag_weights JSONB DEFAULT '{}' NOT NULL,
  object_class_preference JSONB DEFAULT '{}' NOT NULL,
  starter_pack TEXT CHECK (starter_pack IN ('horror', 'surreal', 'scientific', 'heartwarming', 'mystery', 'custom')),
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE visitors IS 'ビジター（ユーザー）の嗜好データを保存';
COMMENT ON COLUMN visitors.visitor_id IS 'クライアント生成UUID（localStorage）';
COMMENT ON COLUMN visitors.user_id IS '将来のSupabase Auth連携用（nullable）';
COMMENT ON COLUMN visitors.preference_vector IS '嗜好ベクトル（1536次元）';
COMMENT ON COLUMN visitors.tag_weights IS 'タグ重み（JSONBオブジェクト）';
COMMENT ON COLUMN visitors.object_class_preference IS 'オブジェクトクラス嗜好（JSONBオブジェクト）';
COMMENT ON COLUMN visitors.starter_pack IS '選択されたスターターパック';
COMMENT ON COLUMN visitors.onboarding_completed_at IS 'オンボーディング完了日時';

-- ============================================
-- 2. view_historyテーブル
-- ============================================
-- 記事閲覧履歴

CREATE TABLE view_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  duration INTEGER
);

COMMENT ON TABLE view_history IS '記事閲覧履歴';
COMMENT ON COLUMN view_history.visitor_id IS '閲覧者のvisitor_id';
COMMENT ON COLUMN view_history.article_id IS '閲覧した記事のID';
COMMENT ON COLUMN view_history.viewed_at IS '閲覧開始日時';
COMMENT ON COLUMN view_history.duration IS '閲覧時間（秒）';

-- ============================================
-- 3. feedbackテーブル
-- ============================================
-- Like/Dislikeのフィードバック

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (visitor_id, article_id)
);

COMMENT ON TABLE feedback IS 'Like/Dislikeフィードバック';
COMMENT ON COLUMN feedback.visitor_id IS 'フィードバック送信者のvisitor_id';
COMMENT ON COLUMN feedback.article_id IS 'フィードバック対象の記事ID';
COMMENT ON COLUMN feedback.type IS 'フィードバックタイプ: like, dislike';

-- ============================================
-- 4. recommendation_logテーブル
-- ============================================
-- 推薦履歴ログ

CREATE TABLE recommendation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('preference', 'serendipity')),
  recommended_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  clicked BOOLEAN DEFAULT false NOT NULL
);

COMMENT ON TABLE recommendation_log IS '推薦履歴ログ';
COMMENT ON COLUMN recommendation_log.visitor_id IS '推薦対象のvisitor_id';
COMMENT ON COLUMN recommendation_log.article_id IS '推薦された記事ID';
COMMENT ON COLUMN recommendation_log.source IS '推薦ソース: preference（嗜好ベース）, serendipity（発見性）';
COMMENT ON COLUMN recommendation_log.clicked IS '推薦がクリックされたか';

-- ============================================
-- 5. favoritesテーブル
-- ============================================
-- お気に入り記事

CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (visitor_id, article_id)
);

COMMENT ON TABLE favorites IS 'お気に入り記事';
COMMENT ON COLUMN favorites.visitor_id IS '登録者のvisitor_id';
COMMENT ON COLUMN favorites.article_id IS 'お気に入りに追加した記事ID';
COMMENT ON COLUMN favorites.added_at IS '追加日時';

-- ============================================
-- 6. インデックス
-- ============================================

-- view_history
CREATE INDEX idx_view_history_visitor ON view_history(visitor_id);
CREATE INDEX idx_view_history_article ON view_history(article_id);

-- feedback
CREATE INDEX idx_feedback_visitor ON feedback(visitor_id);
CREATE INDEX idx_feedback_type ON feedback(visitor_id, type);

-- recommendation_log
CREATE INDEX idx_recommendation_log_visitor ON recommendation_log(visitor_id);

-- favorites
CREATE INDEX idx_favorites_visitor ON favorites(visitor_id);

-- ============================================
-- 7. updated_at 自動更新トリガー
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 確認用コメント
-- ============================================
-- テーブル確認: \dt
-- カラム確認: \d visitors
-- インデックス確認: \di
-- トリガー確認: \dS visitors
