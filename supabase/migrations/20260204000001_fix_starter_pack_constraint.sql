-- ============================================
-- starter_pack CHECK制約の修正
-- ============================================
-- コードで定義されているスターターパック種別と一致させる
-- 旧: 'horror', 'surreal', 'scientific', 'heartwarming', 'mystery', 'custom'
-- 新: 'classic', 'horror', 'scifi', 'heartwarming', 'mystery', 'jp', 'custom'
-- ============================================

-- 既存のCHECK制約を削除
ALTER TABLE visitors
  DROP CONSTRAINT IF EXISTS visitors_starter_pack_check;

-- 新しいCHECK制約を追加
ALTER TABLE visitors
  ADD CONSTRAINT visitors_starter_pack_check
  CHECK (starter_pack IN ('classic', 'horror', 'scifi', 'heartwarming', 'mystery', 'jp', 'custom'));

-- コメント更新
COMMENT ON COLUMN visitors.starter_pack IS '選択されたスターターパック (classic, horror, scifi, heartwarming, mystery, jp, custom)';
