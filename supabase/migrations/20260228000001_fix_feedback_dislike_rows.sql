-- ============================================
-- feedbackテーブル: dislike行の削除 + CHECK制約の再適用
-- ============================================
-- 前回マイグレーション(20260223000001)がCI環境で失敗:
--   本番DBに type='dislike' の行が存在し、CHECK制約と衝突
--   ERROR: check constraint "feedback_type_check" is violated by some row
-- UIにDislikeボタンは存在せず不要データのため削除で対応
-- ============================================

-- 1. dislike行を削除（UIに存在しないため不要データ）
DELETE FROM feedback WHERE type = 'dislike';

-- 2. 前回マイグレーションが途中失敗した場合に備え制約を一旦削除
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_type_check;

-- 3. CHECK制約を再適用
ALTER TABLE feedback ADD CONSTRAINT feedback_type_check CHECK (type IN ('like', 'next'));
