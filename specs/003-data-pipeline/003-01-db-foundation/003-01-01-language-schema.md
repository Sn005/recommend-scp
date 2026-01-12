# Subtask-003-01-01: 言語マスタ・記事テーブル拡張

## 概要

多言語対応の基盤となる言語マスタテーブルを作成し、既存の記事テーブルに言語・処理ステータスフィールドを追加する。

## ユーザーストーリー

**As a** 開発者
**I want** 言語マスタと記事テーブルの拡張を行う
**So that** 多言語記事の管理と処理ステータス追跡が可能になる

## Acceptance Criteria（EARS記法）

### 言語マスタテーブル

- [x] WHEN マイグレーションを実行した際
      GIVEN Supabaseに接続できる場合
      THEN `supported_languages` テーブルが作成される
      AND 以下のカラムが含まれる：- `code` (TEXT, PRIMARY KEY): 言語コード（'en', 'ja'等）- `name` (TEXT): 言語名 - `wiki_url` (TEXT): WikiのベースURL - `crawler_type` (TEXT): 'api' または 'scraping' - `is_active` (BOOLEAN): 有効/無効フラグ - `priority` (INTEGER): 処理優先度

- [x] WHEN 言語マスタに初期データを投入する際
      GIVEN テーブルが存在する場合
      THEN EN（English）が `is_active: true` で登録される
      AND JA（日本語）が `is_active: false` で登録される

### 記事テーブル拡張

- [x] WHEN 記事テーブルを拡張した際
      GIVEN 既存の `scp_articles` テーブルがある場合
      THEN 以下のカラムが追加される：- `lang` (TEXT, DEFAULT 'en'): 言語コード - `source_updated_at` (TIMESTAMPTZ): ソース更新日時 - `is_deleted` (BOOLEAN, DEFAULT false): 削除フラグ - `embedding_status` (TEXT, DEFAULT 'pending'): Embedding処理状態 - `tagging_status` (TEXT, DEFAULT 'pending'): タグ抽出処理状態 - `last_processed_at` (TIMESTAMPTZ): 最終処理日時

- [x] WHEN 既存データをマイグレーションする際
      GIVEN 既存の記事データがある場合
      THEN 全ての既存記事の `lang` が 'en' に設定される
      AND `embedding_status` は既存embedding有無で 'completed' または 'pending' に設定される

### インデックス

- [x] WHEN インデックスを作成した際
      GIVEN テーブルが存在する場合
      THEN `scp_articles(lang)` にインデックスが作成される
      AND `scp_articles(embedding_status)` にインデックスが作成される
      AND `scp_articles(tagging_status)` にインデックスが作成される

## 設計

### supported_languages テーブル

```sql
CREATE TABLE supported_languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  wiki_url TEXT,
  crawler_type TEXT NOT NULL CHECK (crawler_type IN ('api', 'scraping')),
  is_active BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初期データ
INSERT INTO supported_languages (code, name, wiki_url, crawler_type, is_active, priority)
VALUES
  ('en', 'English', 'https://scp-wiki.wikidot.com', 'api', TRUE, 1),
  ('ja', '日本語', 'http://scp-jp.wikidot.com', 'scraping', FALSE, 2);
```

### scp_articles 拡張

```sql
ALTER TABLE scp_articles
  ADD COLUMN lang TEXT DEFAULT 'en' REFERENCES supported_languages(code),
  ADD COLUMN source_updated_at TIMESTAMPTZ,
  ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN embedding_status TEXT DEFAULT 'pending'
    CHECK (embedding_status IN ('pending', 'processing', 'completed', 'error')),
  ADD COLUMN tagging_status TEXT DEFAULT 'pending'
    CHECK (tagging_status IN ('pending', 'processing', 'completed', 'error')),
  ADD COLUMN last_processed_at TIMESTAMPTZ;

-- インデックス
CREATE INDEX idx_scp_articles_lang ON scp_articles(lang);
CREATE INDEX idx_scp_articles_embedding_status ON scp_articles(embedding_status);
CREATE INDEX idx_scp_articles_tagging_status ON scp_articles(tagging_status);
CREATE INDEX idx_scp_articles_is_deleted ON scp_articles(is_deleted) WHERE is_deleted = FALSE;
```

## テストケース

- [x] `supported_languages` テーブルが正常に作成される
- [x] EN/JAの初期データが正しく投入される
- [x] `scp_articles` に新カラムが追加される
- [x] 既存データのマイグレーションが正常に完了する
- [x] 各インデックスが作成される
- [x] 無効な `embedding_status` 値でINSERTするとエラーになる

## 実装状況

- **status**: completed
- **マイグレーションファイル**: `supabase/migrations/20250112000001_language_schema.sql`
- **テストファイル**: `packages/poc/src/migrations/__dev__/003-01-01-language-schema.test.ts`
