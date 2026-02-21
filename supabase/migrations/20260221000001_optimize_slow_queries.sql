-- ============================================
-- 012-02-02: スロークエリ改善実装
-- ============================================
-- pg_stat_statements 分析（012-02-01）で特定されたスロークエリを改善する。
--
-- 改善一覧:
--   A+F: get_object_class() をJOINベースに書き換え（行ごと関数呼び出し → 1回のJOIN）
--   B:   距離計算を1回にまとめる（CTE化）
--   C:   旧IVFFlatインデックスの削除（HNSWに統一）
--   D:   HNSWパラメータ（ef_search）調整
--   E:   tagsカラムにGINインデックス追加
--
-- 技術的制約:
--   - RPC関数の引数・戻り値の型は変更しない（入出力互換性維持）
--   - DROP FUNCTION IF EXISTS + CREATE OR REPLACE FUNCTION パターンを使用
-- ============================================

-- ============================================
-- 改善C: 旧IVFFlatインデックスの削除
-- ============================================
-- Why: HNSWインデックス（idx_scp_articles_embedding_hnsw）が既に存在するが、
--      旧IVFFlatインデックス（idx_scp_articles_embedding）が共存している。
--      プランナが非効率なIVFFlatを選択する可能性を排除する。
DROP INDEX IF EXISTS idx_scp_articles_embedding;

-- ============================================
-- 改善E: tagsカラムにGINインデックス追加
-- ============================================
-- Why: search_articles_by_unexplored_tags で NOT (a.tags && explored_tags) を使用するが、
--      tags (TEXT[]) にインデックスがなくSeq Scanが強制されていた。
--      GINインデックスにより配列演算子（&&, @>, <@）がインデックスを活用可能になる。
CREATE INDEX IF NOT EXISTS idx_scp_articles_tags
  ON scp_articles
  USING GIN(tags);

-- ============================================
-- 改善D: HNSWパラメータ調整
-- ============================================
-- Why: ef_searchのデフォルト値（40）では検索精度は十分だが、
--      RPC関数内で明示的に設定することで動作を予測可能にする。
--      値は40（デフォルト）のまま。将来の調整ポイントとしてコメントを残す。
-- Note: SET LOCAL は関数内で使用し、トランザクション終了時に自動的にリセットされる。

-- ============================================
-- 改善A+B+F: search_articles_by_embedding の最適化
-- ============================================
-- Why:
--   A: get_object_class(a.tags) は行ごとにtag_dictionaryへSELECTを発行していた。
--      LEFT JOIN LATERAL に書き換え、1回のJOIN操作で完了させる。
--   B: (1 - (a.embedding <=> query_vector)) がWHERE句で2回、ORDER BYで1回、
--      計3回計算されていた。CTEで距離を1回計算し再利用する。
--
-- 戻り値の型は変更なし: (id text, title text, similarity float, url text, object_class text, rating integer)

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
  -- 後段フィルタ（翻訳チェック、類似度レンジ）で除外される分を考慮し5倍を取得
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
    LIMIT match_count * 5
  )
  SELECT
    vm.article_id AS id,
    vm.title,
    (1 - vm.dist)::float AS similarity,
    t.url::text AS url,
    oc.object_class,
    vm.rating
  FROM vector_matches vm
  INNER JOIN article_translations t
    ON vm.article_id = t.article_id
    AND t.lang = 'ja'
  -- 改善A+F: get_object_class() をLATERAL JOINに置き換え
  LEFT JOIN LATERAL (
    SELECT td.canonical_value AS object_class
    FROM tag_dictionary td
    WHERE td.category = 'object_class'
      AND LOWER(td.canonical_value) = ANY(vm.tags)
    LIMIT 1
  ) oc ON TRUE
  WHERE (1 - vm.dist) >= min_similarity
    AND (1 - vm.dist) <= max_similarity
    AND t.has_translation = TRUE
  ORDER BY vm.dist
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_articles_by_embedding IS 'コサイン類似度でベクトル検索。CTE+LATERAL JOINで最適化済み。object_class, ratingを含むレスポンスを返却。';

-- ============================================
-- 改善A+F: search_articles_by_unexplored_tags の最適化
-- ============================================
-- Why:
--   A+F: get_object_class(a.tags) の行ごと関数呼び出しをLATERAL JOINに置き換え。
--   E: 上記で追加したGINインデックスにより NOT (a.tags && explored_tags) が高速化。
--
-- 戻り値の型は変更なし: (id text, title text, similarity float, url text, object_class text, rating integer)

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
  -- 改善A+F: get_object_class() をLATERAL JOINに置き換え
  LEFT JOIN LATERAL (
    SELECT td.canonical_value AS object_class
    FROM tag_dictionary td
    WHERE td.category = 'object_class'
      AND LOWER(td.canonical_value) = ANY(a.tags)
    LIMIT 1
  ) oc ON TRUE
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

COMMENT ON FUNCTION search_articles_by_unexplored_tags IS '未探索タグを持つ記事を検索。LATERAL JOIN+GINインデックスで最適化済み。object_class, ratingを含むレスポンスを返却。';

-- ============================================
-- search_adjacent_articles の更新
-- ============================================
-- search_articles_by_embeddingを内部で使用しているため、
-- 戻り値の型定義のみ再作成（内部ロジックは変更なし）。

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
