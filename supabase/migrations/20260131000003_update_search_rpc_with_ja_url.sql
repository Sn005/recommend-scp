-- ============================================
-- 010-02-01: 推薦API日本語対応
-- ============================================
-- RPC関数にarticle_translationsのJOINを追加し、
-- 日本語版URLを返却、has_translation=FALSEを除外する。
-- ============================================

-- ============================================
-- 1. search_articles_by_embedding関数の更新
-- ============================================
-- article_translationsをLEFT JOINしてurlを返す。
-- has_translation = FALSEの記事を除外する。

-- 戻り値の型が変わるため、まずDROPが必要
DROP FUNCTION IF EXISTS search_articles_by_embedding(vector(1536), text[], integer, float, float);

CREATE OR REPLACE FUNCTION search_articles_by_embedding(
  query_vector vector(1536),
  exclude_ids text[] DEFAULT '{}',
  match_count integer DEFAULT 10,
  min_similarity float DEFAULT 0,
  max_similarity float DEFAULT 1
)
RETURNS TABLE (
  id text,
  title text,
  similarity float,
  url text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.article_id AS id,
    a.title,
    (1 - (a.embedding <=> query_vector))::float AS similarity,
    COALESCE(t.url, '')::text AS url
  FROM scp_articles a
  LEFT JOIN article_translations t
    ON a.article_id = t.article_id
    AND t.lang = 'ja'
  WHERE a.embedding IS NOT NULL
    AND NOT (a.article_id = ANY(exclude_ids))
    AND (1 - (a.embedding <=> query_vector)) >= min_similarity
    AND (1 - (a.embedding <=> query_vector)) <= max_similarity
    -- has_translation = FALSE の記事を除外
    -- has_translation = NULL (未確認) または TRUE は含める
    AND (t.has_translation IS NULL OR t.has_translation = TRUE)
  ORDER BY a.embedding <=> query_vector
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_articles_by_embedding IS 'コサイン類似度でベクトル検索。日本語版URLを返却し、has_translation=FALSEを除外。';

-- ============================================
-- 2. search_articles_by_unexplored_tags関数の更新
-- ============================================
-- 同様にarticle_translationsをLEFT JOINしてurlを返す。

-- 戻り値の型が変わるため、まずDROPが必要
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
  url text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.article_id AS id,
    a.title,
    0.5::float AS similarity,
    COALESCE(t.url, '')::text AS url
  FROM scp_articles a
  LEFT JOIN article_translations t
    ON a.article_id = t.article_id
    AND t.lang = 'ja'
  WHERE a.tags IS NOT NULL
    AND NOT (a.article_id = ANY(exclude_ids))
    AND NOT (a.tags && explored_tags)
    -- has_translation = FALSE の記事を除外
    AND (t.has_translation IS NULL OR t.has_translation = TRUE)
  ORDER BY
    CASE WHEN order_by = 'rating' THEN a.rating END DESC NULLS LAST,
    CASE WHEN order_by = 'random' THEN random() END
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_articles_by_unexplored_tags IS '未探索タグを持つ記事を検索。日本語版URLを返却し、has_translation=FALSEを除外。';

-- ============================================
-- 3. search_adjacent_articles関数の更新
-- ============================================
-- search_articles_by_embeddingを内部で使用しているので、
-- 戻り値の型にurlを追加する。

-- 戻り値の型が変わるため、まずDROPが必要
DROP FUNCTION IF EXISTS search_adjacent_articles(vector(1536), text[], integer, float, float);

CREATE OR REPLACE FUNCTION search_adjacent_articles(
  query_vector vector(1536),
  exclude_ids text[] DEFAULT '{}',
  match_count integer DEFAULT 10,
  min_similarity float DEFAULT 0.3,
  max_similarity float DEFAULT 0.7
)
RETURNS TABLE (
  id text,
  title text,
  similarity float,
  url text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM search_articles_by_embedding(
    query_vector,
    exclude_ids,
    match_count,
    min_similarity,
    max_similarity
  );
END;
$$;

COMMENT ON FUNCTION search_adjacent_articles IS 'セレンディピティ用。中間類似度の記事を検索し、日本語版URLを返却。';

-- ============================================
-- 検証クエリ（コメントアウト）
-- ============================================
--
-- 関数の確認:
-- SELECT proname, pg_get_function_result(oid) AS returns
-- FROM pg_proc
-- WHERE proname IN ('search_articles_by_embedding', 'search_articles_by_unexplored_tags', 'search_adjacent_articles');
--
-- 動作確認:
-- SELECT * FROM search_articles_by_embedding(
--   (SELECT embedding FROM scp_articles WHERE embedding IS NOT NULL LIMIT 1),
--   '{}',
--   5,
--   0,
--   1
-- );
--
