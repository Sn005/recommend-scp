-- ============================================
-- 翻訳フィルタをCTE内部に移動
-- ============================================
-- 根本原因: search_articles_by_embedding のCTEが全9,267件（翻訳の有無不問）から
-- 最近傍候補を取得し、外部クエリのINNER JOINで翻訳済みのみに絞り込んでいた。
-- 嗜好ベクトルが指す方向に未翻訳記事が集中する場合、CTE候補全てが
-- INNER JOINで脱落し0件になる。
--
-- 修正: INNER JOIN article_translations をCTE内部に移動し、
-- CTEが翻訳済み記事のみを候補にすることで、LIMIT内の全件が
-- 翻訳済みであることを保証する。
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
  -- CTE: HNSWインデックスを活用してベクトル近傍候補を取得
  -- 翻訳フィルタをCTE内部に配置し、翻訳済み記事のみを候補にする
  -- 後段の類似度レンジフィルタで除外される分を考慮し2倍を取得
  WITH vector_matches AS (
    SELECT
      a.article_id,
      a.title,
      a.tags,
      a.rating,
      t.url AS translation_url,
      (a.embedding <=> query_vector) AS dist
    FROM scp_articles a
    INNER JOIN article_translations t
      ON a.article_id = t.article_id
      AND t.lang = 'ja'
      AND t.has_translation = TRUE
    WHERE a.embedding IS NOT NULL
      AND NOT (a.article_id = ANY(exclude_ids))
    ORDER BY a.embedding <=> query_vector
    LIMIT match_count * 2
  )
  SELECT
    vm.article_id AS id,
    vm.title,
    (1 - vm.dist)::float AS similarity,
    vm.translation_url::text AS url,
    oc.object_class,
    vm.rating
  FROM vector_matches vm
  LEFT JOIN LATERAL (
    SELECT td.canonical_value AS object_class
    FROM tag_dictionary td
    WHERE td.category = 'object_class'
      AND LOWER(td.canonical_value) = ANY(vm.tags)
    LIMIT 1
  ) oc ON TRUE
  WHERE (1 - vm.dist) >= min_similarity
    AND (1 - vm.dist) <= max_similarity
  ORDER BY vm.dist
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_articles_by_embedding IS 'コサイン類似度でベクトル検索。翻訳フィルタをCTE内に配置し翻訳済み記事のみを候補にする。object_class, ratingを含むレスポンスを返却。';
