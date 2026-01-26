-- Migration: Fix search_similar_articles RPC function
-- Description: scp_embeddingsテーブルのカラム名変更(id→article_id)に対応
-- Date: 2026-01-26
--
-- 背景:
-- - 20250119000001マイグレーションでscp_embeddings.idがarticle_idにリネームされた
-- - scp_articles.idはUUIDのサロゲートキーになり、article_idが記事ID("SCP-173"形式)になった
-- - しかしRPC関数は古いカラム名を参照したままだった

-- RPC関数を再作成（カラム名を修正）
CREATE OR REPLACE FUNCTION search_similar_articles(
  query_id TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id TEXT,  -- article_id を返す（後方互換性のためカラム名はidのまま）
  title TEXT,
  similarity_score FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- Get the embedding for the query article
  -- scp_embeddings.article_id で検索（旧: scp_embeddings.id）
  SELECT embedding INTO query_embedding
  FROM scp_embeddings
  WHERE scp_embeddings.article_id = query_id;

  -- Return similar articles
  RETURN QUERY
  SELECT
    a.article_id,  -- 記事ID("SCP-173"形式)を返す（旧: a.id）
    a.title,
    1 - (e.embedding <=> query_embedding) AS similarity_score
  FROM scp_embeddings e
  JOIN scp_articles a ON e.article_id = a.article_id  -- article_idでJOIN（旧: e.id = a.id）
  WHERE e.article_id != query_id  -- 旧: e.id != query_id
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 確認用コメント
-- SELECT * FROM search_similar_articles('SCP-173', 5);
