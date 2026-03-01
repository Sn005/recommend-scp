-- ============================================
-- Phase B インデックス + 未探索タグフィルタ緩和の統合
-- ============================================
-- 背景:
--   Phase B (20260228000001_optimize_slow_queries_phase_b.sql) と
--   relax_unexplored_tags_filter (20260301000001_relax_unexplored_tags_filter.sql)
--   が異なるPRから同一タイムスタンプでマージされ、supabase db push が
--   順序不整合エラーで失敗していた。
--
--   本マイグレーションは両ファイルの必要な変更を統合:
--   1. Phase B のインデックス作成（B-3）
--   2. search_articles_by_unexplored_tags への <@ 緩和フィルタ適用
--
--   Phase B の関数リライト（search_articles_by_embedding, search_adjacent_articles）は
--   Phase C (20260228000002) で上位互換版が既に存在するため含めない。
-- ============================================

-- ============================================
-- 1. Phase B-3: article_translations 部分インデックス
-- ============================================
-- 両RPC関数で INNER JOIN article_translations t
--   ON a.article_id = t.article_id AND t.lang = 'ja'
--   WHERE t.has_translation = TRUE のパターンが使われる。
-- 日本語翻訳済み記事だけの部分インデックスにより、
-- JOINとフィルタを1回のインデックスルックアップで完了。
CREATE INDEX IF NOT EXISTS idx_article_translations_ja_translated
  ON article_translations(article_id)
  WHERE lang = 'ja' AND has_translation = TRUE;

-- ============================================
-- 2. search_articles_by_unexplored_tags: <@ 緩和フィルタ
-- ============================================
-- Phase D (20260301000001) の最適化構造をベースに、フィルタ条件を修正。
--
-- 変更点:
--   explored_articles CTE + NOT EXISTS パターン → NOT (a.tags <@ explored_tags)
--
--   旧: a2.tags && explored_tags → 1つでもタグが重複すれば除外
--   新: NOT (a.tags <@ explored_tags) → 全タグが探索済みの記事のみ除外
--
--   euclid, safe, keter 等の高頻度タグを数記事探索しただけで
--   大半の記事が除外される問題を解消。
--   少なくとも1つ未探索タグを持つ記事は結果に残る。
--
--   GINインデックス idx_scp_articles_tags は <@ 演算子をサポートするため
--   CTE不要でパフォーマンスへの影響はない。
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
  IF order_by = 'rating' THEN
    -- ratingパス: idx_scp_articles_rating_desc を活用
    RETURN QUERY
    WITH base AS (
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
        AND NOT (a.tags <@ explored_tags)
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
    WITH base AS (
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
        AND NOT (a.tags <@ explored_tags)
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

COMMENT ON FUNCTION search_articles_by_unexplored_tags IS '未探索タグ記事検索。Phase D構造（IF/ELSE分岐+LATERAL JOIN遅延）に<@演算子の緩和フィルタを統合。';
