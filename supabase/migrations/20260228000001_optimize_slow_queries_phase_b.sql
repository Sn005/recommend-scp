-- ============================================
-- B案: スロークエリ追加最適化（Phase B）
-- ============================================
-- A案（改善A-F, 20260221000001）適用後の計測結果:
--   search_articles_by_embedding:      391ms avg（目標100msの3.9倍）
--   search_articles_by_unexplored_tags: 604ms avg（目標100msの6.0倍）
--
-- 追加チューニングで目標値への到達を目指す。
--
-- 改善一覧:
--   B-1: ef_search を 40（デフォルト） → 20 に削減
--        推薦用途では厳密な最近傍は不要。探索範囲を半減させ検索を高速化。
--   B-2: over-fetch 倍率を 5x → 3x に削減
--        翻訳フィルタ後の除外率を考慮すると3xで十分。JOIN処理を40%軽量化。
--   B-3: article_translations に部分インデックス追加
--        両RPC関数で使われる (article_id, lang='ja', has_translation=TRUE)
--        パターンに最適化した部分インデックス。
--   B-4: unexplored_tags の NOT (tags && ...) を正引き＋除外パターンに書き換え
--        GINインデックスは否定(NOT &&)では使えないが肯定(&&)では使える。
--        探索済みタグを持つ記事を先にGINで取得し、除外する方式に変更。
--
-- 技術的制約:
--   - RPC関数の引数・戻り値の型は変更しない（入出力互換性維持）
--   - DROP FUNCTION IF EXISTS + CREATE OR REPLACE FUNCTION パターンを使用
-- ============================================

-- ============================================
-- B-3: article_translations 部分インデックス
-- ============================================
-- Why: 両RPC関数で INNER JOIN article_translations t
--      ON a.article_id = t.article_id AND t.lang = 'ja'
--      WHERE t.has_translation = TRUE のパターンが使われる。
--      PK (article_id, lang) ではJOIN後に has_translation フィルタが後段になる。
--      日本語翻訳済み記事だけの部分インデックスにより、
--      JOINとフィルタを1回のインデックスルックアップで完了。
CREATE INDEX IF NOT EXISTS idx_article_translations_ja_translated
  ON article_translations(article_id)
  WHERE lang = 'ja' AND has_translation = TRUE;

-- ============================================
-- B-1 + B-2: search_articles_by_embedding 追加最適化
-- ============================================
-- B-1: SET LOCAL hnsw.ef_search = 20
--   ef_searchはHNSWグラフの探索候補数を制御する。
--   デフォルト40→20に削減することで探索範囲を半減。
--   推薦用途（類似記事提案）では厳密な最近傍は不要であり、
--   上位10件程度の候補品質に実用上の差は生じない。
--   SET LOCALによりトランザクション終了時に自動リセットされる。
--
-- B-2: LIMIT match_count * 5 → match_count * 3
--   CTE内で後段フィルタ（翻訳チェック・類似度レンジ）に備えて
--   候補を多めに取得しているが、5xは過大。
--   日本語翻訳の存在率を考慮しても3xで十分な候補が確保でき、
--   後段のJOIN・フィルタ処理を40%軽量化できる。
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
    -- B-2: over-fetch を 3x に削減（5x → 3x）
    LIMIT match_count * 3
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

COMMENT ON FUNCTION search_articles_by_embedding IS 'コサイン類似度でベクトル検索。B案追加最適化: ef_search=20, over-fetch 3x。';

-- ============================================
-- B-4: search_articles_by_unexplored_tags の最適化
-- ============================================
-- Why: NOT (a.tags && explored_tags) は否定条件のため、
--      GINインデックスを活用できずSeq Scanが強制されていた。
--
--      正引き＋除外パターンに書き換えることで、GINインデックスを活用:
--      1. CTE explored_articles: tags && explored_tags（肯定）→ GINインデックス使用可能
--      2. メインクエリ: NOT EXISTS で explored_articles を除外
--
--      この変換により:
--      - GINインデックスが探索済みタグを持つ記事を高速に特定
--      - NOT EXISTS は Hash Anti Join として実行され、O(n)で完了
--      - 結果は元のクエリと論理的に等価
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
  )
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
    AND NOT EXISTS (
      SELECT 1 FROM explored_articles ea
      WHERE ea.article_id = a.article_id
    )
    AND t.has_translation = TRUE
  ORDER BY
    CASE WHEN order_by = 'rating' THEN a.rating END DESC NULLS LAST,
    CASE WHEN order_by = 'random' THEN random() END
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_articles_by_unexplored_tags IS '未探索タグを持つ記事を検索。B案: NOT && → 正引き除外パターンでGINインデックス活用。';

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
