-- ============================================
-- Fix: get_object_class関数のカラム名修正
-- ============================================
-- 20260206000001で作成されたget_object_class関数が
-- tag_dictionaryテーブルのカラム名を誤って td.value と参照していた。
-- 正しいカラム名は td.canonical_value。
-- Vercelデプロイ環境で推薦API (/api/recommend) が500エラーを返す原因。
-- PostgreSQL error: column td.value does not exist
-- ============================================

CREATE OR REPLACE FUNCTION get_object_class(article_tags TEXT[])
RETURNS TEXT AS $$
DECLARE
  oc TEXT;
BEGIN
  SELECT td.canonical_value INTO oc
  FROM tag_dictionary td
  WHERE td.category = 'object_class'
    AND LOWER(td.canonical_value) = ANY(article_tags)
  LIMIT 1;
  RETURN oc;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_object_class IS 'scp_articles.tagsからオブジェクトクラスを抽出。tag_dictionaryとの突合で判定。';
