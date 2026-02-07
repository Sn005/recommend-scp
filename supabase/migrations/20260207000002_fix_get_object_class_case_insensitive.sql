-- ============================================
-- Fix: get_object_class関数の大文字小文字不一致を修正
-- ============================================
-- scp_articles.tags はWikiから取得した小文字タグ（例: 'euclid', 'safe'）。
-- tag_dictionary.canonical_value は大文字（例: 'EUCLID', 'SAFE'）。
-- 従来のget_object_classは大文字小文字を区別する比較（= ANY）を使用しており、
-- 常にNULLを返していた。
-- LOWER()を使用して大文字小文字を無視する比較に修正。
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

COMMENT ON FUNCTION get_object_class IS 'scp_articles.tagsからオブジェクトクラスを抽出。tag_dictionaryとの大文字小文字無視の突合で判定。';
