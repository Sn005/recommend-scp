-- ============================================
-- feedbackテーブルのtype制約にskipを追加
-- ============================================
-- フロントエンド（006-05-06）でskipフィードバックが導入されたが、
-- DBのCHECK制約が未更新だったため500エラーが発生していた。
-- 既存制約を削除し、skip を含む新しい制約を作成する。
-- ============================================

-- 既存のCHECK制約を削除
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_type_check;

-- skip を含む新しいCHECK制約を追加
ALTER TABLE feedback ADD CONSTRAINT feedback_type_check CHECK (type IN ('like', 'dislike', 'skip'));

-- コメント更新
COMMENT ON COLUMN feedback.type IS 'フィードバックタイプ: like, dislike, skip';
