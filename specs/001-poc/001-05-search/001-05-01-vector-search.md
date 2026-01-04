# Subtask-001-05-01: ベクトル検索実装

## 概要

pgvectorのコサイン類似度検索を使用して、指定した記事に類似する記事を取得する。

## ユーザーストーリー

**As a** 開発者
**I want** Embeddingベクトルで類似記事を検索する
**So that** ベクトル検索の有効性を検証できる

## Acceptance Criteria（EARS記法）

### 基本検索

- [x] WHEN 開発者がベクトル検索スクリプトを実行した際
      GIVEN クエリ記事ID（例: "SCP-173"）を指定した場合
      THEN その記事のEmbeddingを取得する
      AND コサイン類似度で上位5件の類似記事を返す

- [x] WHEN 検索結果を確認した際
      GIVEN 結果が返された場合
      THEN 各結果に以下が含まれる：
      - article_id
      - title
      - similarity_score（0-1）
      AND クエリ記事自身は結果から除外される

### パフォーマンス

- [x] WHEN ベクトル検索を実行した際
      GIVEN 50件程度のデータがある場合
      THEN 検索時間が1秒以内である
      AND 検索時間をコンソールに出力する

### 類似度の妥当性

- [x] WHEN 検索結果を人間が確認した際
      GIVEN 上位5件の結果がある場合
      THEN 「感覚的に類似している」と判断できる
      AND 判断結果を検証レポートに記録できる

## 設計

### pgvector検索クエリ

```sql
-- コサイン類似度検索
SELECT
  a.id,
  a.title,
  1 - (e.embedding <=> query_embedding) AS similarity_score
FROM scp_embeddings e
JOIN scp_articles a ON e.id = a.id
WHERE e.id != $query_id
ORDER BY e.embedding <=> query_embedding
LIMIT $limit;
```

### インターフェース

```typescript
// src/search/vector-search.ts

export interface VectorSearchParams {
  queryId: string;
  limit?: number;  // default: 5
}

export interface VectorSearchResult {
  articleId: string;
  title: string;
  similarityScore: number;
}

export interface VectorSearchResponse {
  queryId: string;
  queryTitle: string;
  results: VectorSearchResult[];
  searchTimeMs: number;
}

export async function vectorSearch(
  params: VectorSearchParams
): Promise<VectorSearchResponse>;
```

### Supabase RPC

```sql
-- Supabase RPC関数
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
  -- クエリ記事のEmbeddingを取得
  SELECT embedding INTO query_embedding
  FROM scp_embeddings
  WHERE scp_embeddings.id = query_id;

  -- 類似記事を検索
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
```

### スクリプト実行

```bash
# 特定の記事で類似検索
pnpm --filter poc run:04-search -- --id SCP-173

# 上位10件
pnpm --filter poc run:04-search -- --id SCP-173 --limit 10

# 全記事でクロスバリデーション
pnpm --filter poc run:04-search -- --all
```

## テストケース

- [x] 指定した記事IDで検索できる
- [x] 上位5件の結果が返される
- [x] クエリ記事自身が結果に含まれない
- [x] similarity_scoreが0-1の範囲である
- [x] 検索時間が1秒以内である
- [x] 結果が「感覚的に類似」している（主観評価）

## 実装状況
- **status**: completed
