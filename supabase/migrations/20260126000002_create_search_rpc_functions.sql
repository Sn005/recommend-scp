-- ============================================
-- 005-02-04: ベクトル検索RPC関数
-- ============================================
-- pgvectorを使用したベクトル類似度検索のSQL RPC関数を作成する。
-- ============================================

-- ============================================
-- 1. search_articles_by_embedding関数
-- ============================================
-- コサイン類似度でベクトル検索を行う。
-- HNSWインデックスを使用して高速に検索。

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
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.article_id AS id,
    a.title,
    (1 - (a.embedding <=> query_vector))::float AS similarity
  FROM scp_articles a
  WHERE a.embedding IS NOT NULL
    AND NOT (a.article_id = ANY(exclude_ids))
    AND (1 - (a.embedding <=> query_vector)) >= min_similarity
    AND (1 - (a.embedding <=> query_vector)) <= max_similarity
  ORDER BY a.embedding <=> query_vector
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_articles_by_embedding IS 'コサイン類似度でベクトル検索を行う。exclude_idsで除外、min/max_similarityでフィルタ可能。';

-- ============================================
-- 2. search_articles_by_unexplored_tags関数
-- ============================================
-- 未探索タグを持つ記事を検索する。
-- order_byでソート方法を指定可能（rating or random）。

CREATE OR REPLACE FUNCTION search_articles_by_unexplored_tags(
  explored_tags text[] DEFAULT '{}',
  exclude_ids text[] DEFAULT '{}',
  match_count integer DEFAULT 10,
  order_by text DEFAULT 'rating'
)
RETURNS TABLE (
  id text,
  title text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.article_id AS id,
    a.title,
    0.5::float AS similarity  -- 固定値
  FROM scp_articles a
  WHERE a.tags IS NOT NULL
    AND NOT (a.article_id = ANY(exclude_ids))
    AND NOT (a.tags && explored_tags)  -- タグが重複しない
  ORDER BY
    CASE WHEN order_by = 'rating' THEN a.rating END DESC NULLS LAST,
    CASE WHEN order_by = 'random' THEN random() END
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_articles_by_unexplored_tags IS '未探索タグを持つ記事を検索する。explored_tagsに含まれないタグを持つ記事を返す。';

-- ============================================
-- 3. search_adjacent_articles関数（セレンディピティ用）
-- ============================================
-- 中間類似度の記事を検索する。
-- search_articles_by_embeddingを内部で使用。

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
  similarity float
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

COMMENT ON FUNCTION search_adjacent_articles IS 'セレンディピティ用。中間類似度（デフォルト0.3-0.7）の記事を検索する。';

-- ============================================
-- 4. HNSWインデックスの確認・作成
-- ============================================
-- EPIC-003/他マイグレーションで作成済みの場合はスキップされる。
-- HNSWはIVFFlatより高速で、少量データでも効果的。

-- 既存のIVFFlatインデックスがあれば、HNSWに置き換えることを検討
-- ただし、本マイグレーションでは既存インデックスは触らない（互換性維持）

-- HNSWインデックスを作成（既存があればスキップ）
-- Note: scp_articles.embeddingに対して作成
DO $$
BEGIN
  -- インデックスが存在しない場合のみ作成
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'scp_articles'
    AND indexname = 'idx_scp_articles_embedding_hnsw'
  ) THEN
    -- 既存のIVFFlatインデックスがある場合は共存させる
    CREATE INDEX idx_scp_articles_embedding_hnsw
      ON scp_articles
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);

    RAISE NOTICE 'HNSWインデックス idx_scp_articles_embedding_hnsw を作成しました';
  ELSE
    RAISE NOTICE 'HNSWインデックス idx_scp_articles_embedding_hnsw は既に存在します';
  END IF;
END;
$$;

-- ============================================
-- 検証クエリ（コメントアウト）
-- ============================================
--
-- RPC関数の確認:
-- SELECT proname, prosrc FROM pg_proc
-- WHERE proname IN ('search_articles_by_embedding', 'search_articles_by_unexplored_tags', 'search_adjacent_articles');
--
-- インデックスの確認:
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename = 'scp_articles' AND indexname LIKE '%embedding%';
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
-- SELECT * FROM search_articles_by_unexplored_tags(
--   ARRAY['horror', 'scientific'],
--   '{}',
--   5,
--   'rating'
-- );
--
-- SELECT * FROM search_adjacent_articles(
--   (SELECT embedding FROM scp_articles WHERE embedding IS NOT NULL LIMIT 1),
--   '{}',
--   5
-- );
