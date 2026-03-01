-- ============================================
-- 未探索タグフィルタの緩和
-- ============================================
-- 根本原因: search_articles_by_unexplored_tags の WHERE 句で
--   NOT (a.tags && explored_tags)
-- を使用していたが、&& 演算子は「1つでもタグが重複すれば true」のため、
-- euclid, safe, keter 等の高頻度タグを5記事分探索しただけで
-- 翻訳済み5,421件の大半が除外され、0件が返る状態だった。
--
-- 修正: && を <@ に変更。
--   NOT (a.tags <@ explored_tags)
-- は「記事のタグ全てが探索済みタグに含まれる場合のみ除外」を意味する。
-- つまり、少なくとも1つ未探索タグを持つ記事は結果に残る。
--
-- GINインデックス idx_scp_articles_tags は <@ 演算子をサポートするため
-- パフォーマンスへの影響はない。
-- ============================================

DROP FUNCTION IF EXISTS search_articles_by_unexplored_tags(text[], text[], integer, text);

CREATE OR REPLACE FUNCTION search_articles_by_unexplored_tags(
  explored_tags text[] DEFAULT '{}',
  exclude_ids text[] DEFAULT '{}',
  match_count integer DEFAULT 10,
  order_by text DEFAULT 'rating'
)
RETURNS TABLE (
  id text,
  title text,
  similarity float,
  url text,
  object_class text,
  rating integer
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.article_id AS id,
    a.title,
    0.5::float AS similarity,
    t.url::text AS url,
    oc.object_class,
    a.rating
  FROM scp_articles a
  INNER JOIN article_translations t
    ON a.article_id = t.article_id
    AND t.lang = 'ja'
  LEFT JOIN LATERAL (
    SELECT td.canonical_value AS object_class
    FROM tag_dictionary td
    WHERE td.category = 'object_class'
      AND LOWER(td.canonical_value) = ANY(a.tags)
    LIMIT 1
  ) oc ON TRUE
  WHERE a.tags IS NOT NULL
    AND NOT (a.article_id = ANY(exclude_ids))
    AND NOT (a.tags <@ explored_tags)
    AND t.has_translation = TRUE
  ORDER BY
    CASE WHEN order_by = 'rating' THEN a.rating END DESC NULLS LAST,
    CASE WHEN order_by = 'random' THEN random() END
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_articles_by_unexplored_tags IS '未探索タグを持つ記事を検索。タグが全て探索済みの記事のみ除外（少なくとも1つ未知タグがあれば返却）。';
