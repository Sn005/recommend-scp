-- ============================================
-- C案: LATERAL JOIN遅延適用（Phase C）
-- ============================================
-- Phase B適用後の計測結果:
--   search_articles_by_embedding:       33.5ms avg（目標達成）
--   search_articles_by_unexplored_tags: 304.4ms avg（目標100msの3.0倍）
--
-- ボトルネック分析:
--   unexplored_tags関数のLATERAL JOIN（object_class抽出）が
--   LIMIT適用前の全候補行に対して実行されている。
--   tag_dictionaryは17行程度だが、候補が数百〜数千行あると
--   相関サブクエリが同数回実行され、顕著な遅延を生む。
--
-- 改善方針:
--   C-1: unexplored_tags の LATERAL JOIN を LIMIT 後に遅延適用
--        全候補行 → match_count行（通常10件）に実行回数を削減。
--   C-2: embedding検索も同様に LATERAL JOIN を最終LIMIT後に移動
--        30行 → 10行への削減。軽微だが一貫性のため統一。
--
-- 技術的制約:
--   - RPC関数の引数・戻り値の型は変更しない（入出力互換性維持）
--   - DROP FUNCTION IF EXISTS + CREATE OR REPLACE FUNCTION パターン
-- ============================================

-- ============================================
-- C-1: search_articles_by_unexplored_tags
--      LATERAL JOIN を LIMIT 後に遅延適用
-- ============================================
-- Before: FROM scp_articles → LATERAL JOIN tag_dictionary → WHERE → LIMIT
--         → LATERAL JOINが全候補行（数百〜数千）で実行
--
-- After:  FROM scp_articles → WHERE → LIMIT → LATERAL JOIN tag_dictionary
--         → LATERAL JOINがmatch_count行（10件）のみで実行
--
-- 期待効果: LATERAL JOIN実行回数を数百回→10回に削減（30-50%改善）
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
  WITH explored_articles AS (
    -- GINインデックス（idx_scp_articles_tags）を活用して
    -- 探索済みタグと重複するタグを持つ記事を高速に取得
    SELECT a2.article_id
    FROM scp_articles a2
    WHERE a2.tags && explored_tags
  ),
  base AS (
    -- LATERAL JOINなしで候補をフィルタ＋ソート＋LIMIT
    SELECT
      a.article_id,
      a.title,
      a.tags,
      a.rating,
      t.url
    FROM scp_articles a
    INNER JOIN article_translations t
      ON a.article_id = t.article_id
      AND t.lang = 'ja'
    WHERE a.tags IS NOT NULL
      AND NOT (a.article_id = ANY(exclude_ids))
      AND NOT EXISTS (
        SELECT 1 FROM explored_articles ea
        WHERE ea.article_id = a.article_id
      )
      AND t.has_translation = TRUE
    ORDER BY
      CASE WHEN order_by = 'rating' THEN a.rating END DESC NULLS LAST,
      CASE WHEN order_by = 'random' THEN random() END
    LIMIT match_count
  )
  -- LIMIT後の10件のみにLATERAL JOINを適用
  SELECT
    base.article_id AS id,
    base.title,
    0.5::float AS similarity,
    base.url::text AS url,
    oc.object_class,
    base.rating
  FROM base
  LEFT JOIN LATERAL (
    SELECT td.canonical_value AS object_class
    FROM tag_dictionary td
    WHERE td.category = 'object_class'
      AND LOWER(td.canonical_value) = ANY(base.tags)
    LIMIT 1
  ) oc ON TRUE;
END;
$$;

COMMENT ON FUNCTION search_articles_by_unexplored_tags IS '未探索タグ記事検索。Phase C: LATERAL JOINをLIMIT後に遅延適用。';

-- ============================================
-- C-2: search_articles_by_embedding
--      LATERAL JOIN を最終LIMIT後に移動
-- ============================================
-- Before: vector_matches(30行) → JOIN + LATERAL JOIN → LIMIT 10
--         → LATERAL JOINが30行で実行
--
-- After:  vector_matches(30行) → JOIN → LIMIT 10 → LATERAL JOIN
--         → LATERAL JOINが10行のみで実行
--
-- 期待効果: 30行→10行（軽微だが一貫性のため統一）
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
  -- B-1: ef_search を 20 に設定（推薦用途では十分な精度）
  SET LOCAL hnsw.ef_search = 20;

  RETURN QUERY
  WITH vector_matches AS (
    SELECT
      a.article_id,
      a.title,
      a.tags,
      a.rating,
      (a.embedding <=> query_vector) AS dist
    FROM scp_articles a
    WHERE a.embedding IS NOT NULL
      AND NOT (a.article_id = ANY(exclude_ids))
    ORDER BY a.embedding <=> query_vector
    -- B-2: over-fetch を 3x に削減
    LIMIT match_count * 3
  ),
  filtered AS (
    -- 翻訳JOIN＋類似度フィルタ後にLIMIT（LATERAL JOINなし）
    SELECT
      vm.article_id,
      vm.title,
      vm.tags,
      vm.rating,
      vm.dist,
      t.url
    FROM vector_matches vm
    INNER JOIN article_translations t
      ON vm.article_id = t.article_id
      AND t.lang = 'ja'
    WHERE (1 - vm.dist) >= min_similarity
      AND (1 - vm.dist) <= max_similarity
      AND t.has_translation = TRUE
    ORDER BY vm.dist
    LIMIT match_count
  )
  -- LIMIT後の最終結果のみにLATERAL JOINを適用
  SELECT
    filtered.article_id AS id,
    filtered.title,
    (1 - filtered.dist)::float AS similarity,
    filtered.url::text AS url,
    oc.object_class,
    filtered.rating
  FROM filtered
  LEFT JOIN LATERAL (
    SELECT td.canonical_value AS object_class
    FROM tag_dictionary td
    WHERE td.category = 'object_class'
      AND LOWER(td.canonical_value) = ANY(filtered.tags)
    LIMIT 1
  ) oc ON TRUE;
END;
$$;

COMMENT ON FUNCTION search_articles_by_embedding IS 'コサイン類似度ベクトル検索。Phase C: LATERAL JOINをLIMIT後に遅延適用。';

-- ============================================
-- search_adjacent_articles の再作成（依存関数）
-- ============================================
-- search_articles_by_embedding を内部で使用しているため、
-- 関数シグネチャの整合性維持のために再作成。ロジックは変更なし。
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

COMMENT ON FUNCTION search_adjacent_articles IS 'セレンディピティ用。中間類似度の記事を検索。';
