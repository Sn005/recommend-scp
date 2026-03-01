-- ============================================
-- D案: ORDER BY分岐 + ratingインデックス（Phase D）
-- ============================================
-- Phase C適用後の計測結果:
--   search_articles_by_unexplored_tags: 196.66ms avg（目標100msの約2倍）
--   EXPLAIN ANALYZE: 353ms, Shared Hit Blocks 2245（全キャッシュ）
--
-- ボトルネック分析:
--   1. scp_articles.rating にインデックスが存在しない
--   2. CASE WHEN order_by = 'rating' の動的ORDER BYにより
--      PostgreSQLがインデックスを使えず、全候補行のソートが発生
--   3. 2245ブロック（約18MB）のバッファ読み取り
--
-- 改善方針:
--   D-1: rating DESC の部分インデックスを追加
--        tags IS NOT NULL条件付きで、関数の主要フィルタと一致させる
--   D-2: CASE WHEN ORDER BY → IF/ELSE分岐に変更
--        PLpgSQL分岐により、ratingパスではインデックススキャンが可能に
--        → 全行ソート不要、インデックス順にスキャンしてLIMIT件で停止
--
-- 期待効果:
--   全行スキャン+ソート → インデックス順スキャン+早期停止
--   196ms → 50ms以下を期待
-- ============================================

-- ============================================
-- D-1: rating DESC 部分インデックス
-- ============================================
-- ORDER BY rating DESC NULLS LAST + WHERE tags IS NOT NULL の
-- クエリパターンに最適化した部分インデックス。
-- インデックス順スキャンにより、全行ソートを回避。
CREATE INDEX IF NOT EXISTS idx_scp_articles_rating_desc
  ON scp_articles(rating DESC NULLS LAST)
  WHERE tags IS NOT NULL;

-- ============================================
-- D-2: search_articles_by_unexplored_tags
--      CASE WHEN ORDER BY → IF/ELSE分岐
-- ============================================
-- Before: ORDER BY CASE WHEN order_by = 'rating' THEN ... END
--         → PostgreSQLは式全体を評価、インデックス使用不可
--
-- After:  IF order_by = 'rating' THEN ... ORDER BY a.rating DESC
--         → PostgreSQLがidx_scp_articles_rating_descを使用可能
--         → インデックス順スキャンでLIMIT件取得後に停止
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
  IF order_by = 'rating' THEN
    -- ratingパス: idx_scp_articles_rating_desc を活用
    RETURN QUERY
    WITH explored_articles AS (
      SELECT a2.article_id
      FROM scp_articles a2
      WHERE a2.tags && explored_tags
    ),
    base AS (
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
      ORDER BY a.rating DESC NULLS LAST
      LIMIT match_count
    )
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

  ELSE
    -- randomパス: インデックス不要、全候補からランダム選択
    RETURN QUERY
    WITH explored_articles AS (
      SELECT a2.article_id
      FROM scp_articles a2
      WHERE a2.tags && explored_tags
    ),
    base AS (
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
      ORDER BY random()
      LIMIT match_count
    )
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

  END IF;
END;
$$;

COMMENT ON FUNCTION search_articles_by_unexplored_tags IS '未探索タグ記事検索。Phase D: IF/ELSE分岐+ratingインデックス。';
