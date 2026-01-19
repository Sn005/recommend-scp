-- ============================================
-- 実装コードに合わせたスキーマ修正
-- ============================================
-- batch-embedding.ts, batch-tagging.ts の実装に合わせて
-- 不足しているカラムと制約を追加する。
-- ============================================

-- ============================================
-- 1. scp_articles に embedding カラムを追加
-- ============================================
-- batch-embedding.ts が scp_articles.embedding に直接保存するため

-- pgvector拡張が有効であることを確認
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE scp_articles
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

COMMENT ON COLUMN scp_articles.embedding IS 'Embeddingベクトル（1536次元）';

-- embeddingカラムのインデックス（コサイン類似度検索用）
CREATE INDEX IF NOT EXISTS idx_scp_articles_embedding
  ON scp_articles
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================
-- 2. scp_articles に last_tagged_at カラムを追加
-- ============================================
-- batch-tagging.ts が last_tagged_at を使用するため

ALTER TABLE scp_articles
  ADD COLUMN IF NOT EXISTS last_tagged_at TIMESTAMPTZ;

COMMENT ON COLUMN scp_articles.last_tagged_at IS 'タグ抽出完了日時';

-- ============================================
-- 3. retry_queue の task_type を operation にリネーム
-- ============================================
-- batch-embedding.ts, batch-tagging.ts が operation を使用するため

-- 既存のユニーク制約を削除
ALTER TABLE retry_queue
  DROP CONSTRAINT IF EXISTS retry_queue_article_id_task_type_key;

-- CHECK制約を削除
ALTER TABLE retry_queue
  DROP CONSTRAINT IF EXISTS retry_queue_task_type_check;

-- カラム名をリネーム
ALTER TABLE retry_queue
  RENAME COLUMN task_type TO operation;

-- 新しいCHECK制約を追加
ALTER TABLE retry_queue
  ADD CONSTRAINT retry_queue_operation_check
  CHECK (operation IN ('embedding', 'tagging'));

-- 新しいユニーク制約を追加
ALTER TABLE retry_queue
  ADD CONSTRAINT retry_queue_article_id_operation_key
  UNIQUE (article_id, operation);

-- コメント更新
COMMENT ON COLUMN retry_queue.operation IS 'オペレーションタイプ: embedding, tagging';

-- ============================================
-- 4. retry_queue の外部キー制約を再作成
-- ============================================
-- 20250119000001 で削除した外部キーを article_id で再作成
-- scp_articles.article_id を参照（article_id, lang の複合ユニークキーの一部）

-- 注意: scp_articles.article_id は単独ではユニークではないため、
-- 外部キー制約は設定しない（参照整合性はアプリケーション層で担保）

-- ============================================
-- 5. scp_embeddings テーブルにも article_id インデックスを追加
-- ============================================
-- scp_embeddings.article_id での検索を高速化

CREATE INDEX IF NOT EXISTS idx_scp_embeddings_article_id
  ON scp_embeddings(article_id);

-- ============================================
-- 検証クエリ（コメントアウト）
-- ============================================
--
-- scp_articles カラム確認:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'scp_articles' AND column_name IN ('embedding', 'last_tagged_at');
--
-- retry_queue カラム確認:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'retry_queue';
--
-- retry_queue 制約確認:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'retry_queue'::regclass;
--
