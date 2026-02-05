-- ============================================
-- 推薦RPC関数: 翻訳フィルタを厳格化
-- ============================================
-- has_translation IS NULL（未検証）の記事を推薦対象から除外する。
-- 検証済み(TRUE)の記事のみを推薦することで、翻訳なし記事の表示を防止。
--
-- 前提: scripts/verify-translations.ts でバッチ検証を実施済みであること。
-- ============================================

-- ============================================
-- 1. search_articles_by_embedding関数の更新
-- ============================================

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
  INNER JOIN article_translations t
    ON a.article_id = t.article_id
    AND t.lang = 'ja'
  WHERE a.embedding IS NOT NULL
    AND NOT (a.article_id = ANY(exclude_ids))
    AND (1 - (a.embedding <=> query_vector)) >= min_similarity
    AND (1 - (a.embedding <=> query_vector)) <= max_similarity
    -- 検証済みかつ翻訳ありの記事のみ返却
    AND t.has_translation = TRUE
  ORDER BY a.embedding <=> query_vector
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_articles_by_embedding IS 'コサイン類似度でベクトル検索。翻訳検証済み(has_translation=TRUE)の記事のみ返却。';

-- ============================================
-- 2. search_articles_by_unexplored_tags関数の更新
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
  INNER JOIN article_translations t
    ON a.article_id = t.article_id
    AND t.lang = 'ja'
  WHERE a.tags IS NOT NULL
    AND NOT (a.article_id = ANY(exclude_ids))
    AND NOT (a.tags && explored_tags)
    -- 検証済みかつ翻訳ありの記事のみ返却
    AND t.has_translation = TRUE
  ORDER BY
    CASE WHEN order_by = 'rating' THEN a.rating END DESC NULLS LAST,
    CASE WHEN order_by = 'random' THEN random() END
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_articles_by_unexplored_tags IS '未探索タグを持つ記事を検索。翻訳検証済み(has_translation=TRUE)の記事のみ返却。';

-- ============================================
-- 3. search_adjacent_articles関数の更新
-- ============================================

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

COMMENT ON FUNCTION search_adjacent_articles IS 'セレンディピティ用。中間類似度の記事を検索し、翻訳検証済みの記事のみ返却。';
