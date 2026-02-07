-- ============================================
-- 006-05-01: 推薦APIレスポンス拡張
-- ============================================
-- RPC関数にobject_class, ratingカラムを追加する。
-- object_classはscp_articles.tagsとtag_dictionaryを突合して抽出。
-- ratingはscp_articles.ratingをそのまま返却。
-- ============================================

-- ============================================
-- 0. objectClassを抽出するヘルパー関数
-- ============================================
-- scp_articles.tags（TEXT[]）とtag_dictionary（category='object_class'）を突合し、
-- 最初に見つかったオブジェクトクラスを返す。該当なしの場合はNULLを返す。

CREATE OR REPLACE FUNCTION get_object_class(article_tags TEXT[])
RETURNS TEXT AS $$
DECLARE
  oc TEXT;
BEGIN
  SELECT td.value INTO oc
  FROM tag_dictionary td
  WHERE td.category = 'object_class'
    AND td.value = ANY(article_tags)
  LIMIT 1;
  RETURN oc;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_object_class IS 'scp_articles.tagsからオブジェクトクラスを抽出。tag_dictionaryとの突合で判定。';

-- ============================================
-- 1. search_articles_by_embedding関数の更新
-- ============================================
-- RETURNS TABLEにobject_class, ratingを追加。

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
  url text,
  object_class text,
  rating integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.article_id AS id,
    a.title,
    (1 - (a.embedding <=> query_vector))::float AS similarity,
    COALESCE(t.url, '')::text AS url,
    get_object_class(a.tags) AS object_class,
    a.rating
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

COMMENT ON FUNCTION search_articles_by_embedding IS 'コサイン類似度でベクトル検索。object_class, ratingを含むレスポンスを返却。';

-- ============================================
-- 2. search_articles_by_unexplored_tags関数の更新
-- ============================================
-- RETURNS TABLEにobject_class, ratingを追加。

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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.article_id AS id,
    a.title,
    0.5::float AS similarity,
    COALESCE(t.url, '')::text AS url,
    get_object_class(a.tags) AS object_class,
    a.rating
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

COMMENT ON FUNCTION search_articles_by_unexplored_tags IS '未探索タグを持つ記事を検索。object_class, ratingを含むレスポンスを返却。';

-- ============================================
-- 3. search_adjacent_articles関数の更新
-- ============================================
-- search_articles_by_embeddingを内部で使用しているため、
-- 戻り値の型にobject_class, ratingを追加。

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
  url text,
  object_class text,
  rating integer
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

COMMENT ON FUNCTION search_adjacent_articles IS 'セレンディピティ用。中間類似度の記事を検索。object_class, ratingを含むレスポンスを返却。';

-- ============================================
-- 検証クエリ（コメントアウト）
-- ============================================
--
-- ヘルパー関数の確認:
-- SELECT get_object_class(ARRAY['EUCLID', 'HORROR', 'COGNITION']);
-- → 'EUCLID'
--
-- SELECT get_object_class(ARRAY['HORROR', 'COGNITION']);
-- → NULL
--
-- RPC関数の確認:
-- SELECT proname, pg_get_function_result(oid) AS returns
-- FROM pg_proc
-- WHERE proname IN ('search_articles_by_embedding', 'search_articles_by_unexplored_tags', 'search_adjacent_articles', 'get_object_class');
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
