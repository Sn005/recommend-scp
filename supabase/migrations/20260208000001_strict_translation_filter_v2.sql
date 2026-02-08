-- ============================================
-- 翻訳フィルタ厳格化: 未翻訳記事を推薦結果から除外
-- ============================================
-- 全記事のhas_translationフラグ付けが完了したため、
-- LEFT JOIN + (IS NULL OR TRUE) → INNER JOIN + TRUE に変更。
-- これにより未翻訳記事がAPIレスポンスに含まれなくなる。
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
    t.url::text AS url,
    get_object_class(a.tags) AS object_class,
    a.rating
  FROM scp_articles a
  INNER JOIN article_translations t
    ON a.article_id = t.article_id
    AND t.lang = 'ja'
  WHERE a.embedding IS NOT NULL
    AND NOT (a.article_id = ANY(exclude_ids))
    AND (1 - (a.embedding <=> query_vector)) >= min_similarity
    AND (1 - (a.embedding <=> query_vector)) <= max_similarity
    AND t.has_translation = TRUE
  ORDER BY a.embedding <=> query_vector
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_articles_by_embedding IS 'コサイン類似度でベクトル検索。翻訳確認済み(has_translation=TRUE)の記事のみ返却。';

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
    t.url::text AS url,
    get_object_class(a.tags) AS object_class,
    a.rating
  FROM scp_articles a
  INNER JOIN article_translations t
    ON a.article_id = t.article_id
    AND t.lang = 'ja'
  WHERE a.tags IS NOT NULL
    AND NOT (a.article_id = ANY(exclude_ids))
    AND NOT (a.tags && explored_tags)
    AND t.has_translation = TRUE
  ORDER BY
    CASE WHEN order_by = 'rating' THEN a.rating END DESC NULLS LAST,
    CASE WHEN order_by = 'random' THEN random() END
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_articles_by_unexplored_tags IS '未探索タグを持つ記事を検索。翻訳確認済み(has_translation=TRUE)の記事のみ返却。';

-- ============================================
-- 3. search_adjacent_articles関数の更新
-- ============================================
-- search_articles_by_embeddingのシグネチャは変更なしのため再定義不要。
-- 内部でsearch_articles_by_embeddingを呼ぶため、フィルタは自動的に適用される。
