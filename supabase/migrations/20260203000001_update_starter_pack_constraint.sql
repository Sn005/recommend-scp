-- ============================================
-- 006-ex01-03: starter_pack制約の更新
-- ============================================
-- 新しいスターターパックタイプを追加
-- 旧: horror, surreal, scientific, heartwarming, mystery, custom
-- 新: classic, horror, scifi, heartwarming, mystery, jp, custom
-- ============================================

-- 1. 既存のCHECK制約を削除（制約名が不明なので動的に検索して削除）
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'visitors'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%starter_pack%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE visitors DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- 2. 既存データの移行（制約削除後に実行）
UPDATE visitors SET starter_pack = 'scifi' WHERE starter_pack = 'scientific';
UPDATE visitors SET starter_pack = 'classic' WHERE starter_pack = 'surreal';

-- 3. 新しいCHECK制約を追加（新しいパックタイプを含む）
ALTER TABLE visitors ADD CONSTRAINT visitors_starter_pack_check
  CHECK (starter_pack IN ('classic', 'horror', 'scifi', 'heartwarming', 'mystery', 'jp', 'custom'));

-- コメント更新
COMMENT ON COLUMN visitors.starter_pack IS '選択されたスターターパック: classic, horror, scifi, heartwarming, mystery, jp, custom';
