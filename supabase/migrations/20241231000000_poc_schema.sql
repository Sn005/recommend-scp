-- ============================================
-- SCP Recommend PoC - Database Schema
-- ============================================
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. SCP Articles table
CREATE TABLE IF NOT EXISTS scp_articles (
  id TEXT PRIMARY KEY,              -- e.g., "SCP-173"
  title TEXT,
  content TEXT,
  rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Embeddings table (pgvector)
CREATE TABLE IF NOT EXISTS scp_embeddings (
  id TEXT PRIMARY KEY REFERENCES scp_articles(id) ON DELETE CASCADE,
  embedding vector(1536),           -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tags master table
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,           -- 'object_class', 'genre', 'theme', 'format'
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, value)
);

-- 5. Article-Tags junction table
CREATE TABLE IF NOT EXISTS article_tags (
  article_id TEXT REFERENCES scp_articles(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (article_id, tag_id)
);

-- ============================================
-- Indexes
-- ============================================

-- Cosine similarity search index for embeddings
-- Note: IVFFlat requires at least 100 rows to be effective
-- For PoC with small data, we'll create the index but it may not be used
CREATE INDEX IF NOT EXISTS idx_scp_embeddings_embedding
  ON scp_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Tag search indexes
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_article_tags_article ON article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_tag ON article_tags(tag_id);

-- ============================================
-- RPC Functions for similarity search
-- ============================================

-- Vector similarity search function
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
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- Get the embedding for the query article
  SELECT embedding INTO query_embedding
  FROM scp_embeddings
  WHERE scp_embeddings.id = query_id;

  -- Return similar articles
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    1 - (e.embedding <=> query_embedding) AS similarity_score
  FROM scp_embeddings e
  JOIN scp_articles a ON e.id = a.id
  WHERE e.id != query_id
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- Verification queries (run after setup)
-- ============================================
--
-- Check pgvector extension:
-- SELECT * FROM pg_extension WHERE extname = 'vector';
--
-- Check tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN ('scp_articles', 'scp_embeddings', 'tags', 'article_tags');
--
-- Check embedding column type:
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name = 'scp_embeddings' AND column_name = 'embedding';
