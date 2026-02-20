-- ============================================
-- 014-01-01: DBマイグレーション（authorカラム追加）
-- scp_articlesテーブルに著者情報カラムを追加
-- ============================================
-- CC BY-SA 3.0の帰属表示要件を満たすため、
-- SCP Data APIの creator フィールドを保存する
-- author カラムを追加する。
--
-- NULL許容: 既存データにはauthorがないため
-- インデックス不要: authorでの検索は想定しない
-- RLS: 既存の scp_articles RLSポリシーでカバー
-- ============================================

-- Up
ALTER TABLE scp_articles ADD COLUMN author TEXT;

-- Down (rollback)
-- ALTER TABLE scp_articles DROP COLUMN IF EXISTS author;
