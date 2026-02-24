-- ============================================
-- feedbackテーブル: metadata追加 + skip→next + dislike除去
-- ============================================
-- GAP-1解消: metadataカラム追加（scrollDepth, dwellTime, interestLevel）
-- 命名改善: skip → next（操作の意味に合致する命名に変更）
-- YAGNI: dislike除去（UIにDislikeボタンなし、発火パスなし）
-- ============================================

-- 1. metadataカラムを追加（JSONB）
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN feedback.metadata IS 'フィードバックメタデータ（scrollDepth, dwellTime, interestLevel）';

-- 2. 既存のCHECK制約を削除（UPDATEの前に削除しないと制約違反になる）
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_type_check;

-- 3. skip → next にリネーム
UPDATE feedback SET type = 'next' WHERE type = 'skip';

-- 4. 新しいCHECK制約（dislike除去 + next追加）
ALTER TABLE feedback ADD CONSTRAINT feedback_type_check CHECK (type IN ('like', 'next'));

-- 5. コメント更新
COMMENT ON COLUMN feedback.type IS 'フィードバックタイプ: like, next';
