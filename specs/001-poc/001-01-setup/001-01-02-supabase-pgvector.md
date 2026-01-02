# Subtask-001-01-02: Supabase pgvector設定

## 概要

Supabaseプロジェクトを作成し、pgvector拡張を有効化、PoC用テーブルを作成する。

## ユーザーストーリー

**As a** 開発者
**I want** Supabase上でpgvectorを使えるようにする
**So that** Embeddingベクトルの保存と類似度検索ができる

## Acceptance Criteria（EARS記法）

### Supabaseプロジェクト

- [x] WHEN 開発者がSupabaseダッシュボードを確認した際
      GIVEN プロジェクトが作成されている場合
      THEN `recommend-scp-poc` という名前のプロジェクトが存在する
      AND 無料プラン（Free tier）で作成されている

### pgvector拡張

- [x] WHEN 開発者がSQL Editorで拡張を確認した際
      GIVEN pgvectorが有効化されている場合
      THEN `SELECT * FROM pg_extension WHERE extname = 'vector'` が結果を返す

### テーブル作成

- [x] WHEN 開発者がテーブル一覧を確認した際
      GIVEN マイグレーションが実行されている場合
      THEN 以下のテーブルが存在する：
      - scp_articles
      - scp_embeddings
      - tags
      - article_tags

- [x] WHEN 開発者がscp_embeddingsテーブルを確認した際
      GIVEN テーブルが正しく作成されている場合
      THEN embedding カラムが `vector(1536)` 型である

### 接続確認

- [x] WHEN 開発者がpocパッケージから接続を試行した際
      GIVEN 環境変数が正しく設定されている場合
      THEN Supabaseクライアントが接続に成功する
      AND テーブルへのCRUD操作が可能である

## 設計

### データベーススキーマ

```sql
-- pgvector拡張有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- SCP記事テーブル
CREATE TABLE scp_articles (
  id TEXT PRIMARY KEY,           -- e.g., "SCP-173"
  title TEXT,
  content TEXT,
  rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Embeddingテーブル（pgvector）
CREATE TABLE scp_embeddings (
  id TEXT PRIMARY KEY REFERENCES scp_articles(id) ON DELETE CASCADE,
  embedding vector(1536),        -- OpenAI text-embedding-3-small
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- タグマスタ
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,        -- 'object_class', 'genre', 'theme', 'format'
  value TEXT NOT NULL,
  UNIQUE(category, value)
);

-- 記事-タグ関連
CREATE TABLE article_tags (
  article_id TEXT REFERENCES scp_articles(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- コサイン類似度検索用インデックス
CREATE INDEX ON scp_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- タグ検索用インデックス
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_article_tags_article ON article_tags(article_id);
CREATE INDEX idx_article_tags_tag ON article_tags(tag_id);
```

### マイグレーションファイル

```
supabase/
└── migrations/
    └── 20241231000000_poc_schema.sql
```

### 環境変数

```env
# .env.example
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # バッチ処理用
```

## テストケース

- [x] pgvector拡張が有効化されている
- [x] 全テーブルが作成されている
- [x] vector(1536) 型のカラムにデータを挿入できる
- [x] コサイン類似度検索クエリが実行できる

## 実装状況

- **status**: completed
