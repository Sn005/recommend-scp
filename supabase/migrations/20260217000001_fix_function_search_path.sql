-- ============================================
-- 009-04-01: Security Advisorアラート対応
-- function_search_path_mutable の修正
-- ============================================
-- Supabase Security Advisorで検出された9関数の
-- search_path未設定アラートを解消する。
--
-- 危険性:
--   search_pathが未設定（mutable）だと、関数実行時のsearch_pathが
--   呼び出し元の設定を継承する。攻撃者が search_path を操作して
--   同名の偽テーブルを優先させると、データ漏洩や改ざんが発生しうる。
--   SET search_path を明示することで、参照先スキーマが固定され、
--   この攻撃経路を遮断できる。
--
-- 対象関数（9件）:
--   1. get_table_columns        (SECURITY DEFINER)
--   2. get_table_indexes        (SECURITY DEFINER)
--   3. search_tag_by_alias      (SECURITY DEFINER)
--   4. update_updated_at        (TRIGGER)
--   5. search_similar_articles
--   6. search_articles_by_embedding
--   7. search_articles_by_unexplored_tags
--   8. search_adjacent_articles
--   9. get_object_class
-- ============================================

-- ============================================
-- 1. get_table_columns (SECURITY DEFINER)
-- ============================================

CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  column_default TEXT,
  is_nullable TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.column_default::TEXT,
    c.is_nullable::TEXT
  FROM information_schema.columns c
  WHERE c.table_name = p_table_name
    AND c.table_schema = 'public';
END;
$$;

-- ============================================
-- 2. get_table_indexes (SECURITY DEFINER)
-- ============================================

CREATE OR REPLACE FUNCTION get_table_indexes(p_table_name TEXT)
RETURNS TABLE (
  index_name TEXT,
  index_definition TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.indexname::TEXT,
    i.indexdef::TEXT
  FROM pg_indexes i
  WHERE i.tablename = p_table_name
    AND i.schemaname = 'public';
END;
$$;

-- ============================================
-- 3. search_tag_by_alias (SECURITY DEFINER)
-- ============================================

CREATE OR REPLACE FUNCTION search_tag_by_alias(
  p_alias TEXT,
  p_lang TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_canonical_value TEXT;
BEGIN
  IF p_alias IS NULL OR p_alias = '' THEN
    RETURN NULL;
  END IF;

  SELECT td.canonical_value INTO v_canonical_value
  FROM tag_dictionary td
  JOIN tag_localizations tl ON td.id = tl.tag_id
  WHERE tl.lang = p_lang
    AND (
      tl.localized_value ILIKE p_alias
      OR EXISTS (
        SELECT 1 FROM unnest(tl.aliases) AS alias
        WHERE alias ILIKE p_alias
      )
    )
  LIMIT 1;

  RETURN v_canonical_value;
END;
$$;

-- ============================================
-- 4. update_updated_at (TRIGGER)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- 5. search_similar_articles
-- ============================================

CREATE OR REPLACE FUNCTION search_similar_articles(
  query_id TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  similarity_score FLOAT
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  SELECT embedding INTO query_embedding
  FROM scp_embeddings
  WHERE scp_embeddings.article_id = query_id;

  RETURN QUERY
  SELECT
    a.article_id,
    a.title,
    1 - (e.embedding <=> query_embedding) AS similarity_score
  FROM scp_embeddings e
  JOIN scp_articles a ON e.article_id = a.article_id
  WHERE e.article_id != query_id
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- 6. search_articles_by_embedding
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
SET search_path = 'public'
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
-- 7. search_articles_by_unexplored_tags
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
-- 8. search_adjacent_articles
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
  url text,
  object_class text,
  rating integer
)
LANGUAGE plpgsql
SET search_path = 'public'
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
-- 9. get_object_class
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
$$ LANGUAGE plpgsql STABLE
SET search_path = 'public';

COMMENT ON FUNCTION get_object_class IS 'scp_articles.tagsからオブジェクトクラスを抽出。tag_dictionaryとの大文字小文字無視の突合で判定。';
