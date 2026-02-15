---
id: "009-01-02"
epic_id: "009"
story_id: "009-01"
epic_title: "セキュリティ強化"
story_title: "RLS拡充・DB層セキュリティ"
title: "マスターデータテーブルRLS設定"
status: "pending"
created_at: "2026-02-15"
updated_at: "2026-02-15"
completed_at: null
---

# Subtask: マスターデータテーブルRLS設定

## 親Story

[009-01: RLS拡充・DB層セキュリティ](./009-01.md)

## ユーザーストーリー

**ペルソナ**: システム運用者
**目的**: マスターデータテーブルにRLSポリシーを設定する
**価値**: 記事・タグ・パイプライン等のマスターデータがDB層で保護され、不正な改ざんを防止する
**理由**: マスターデータテーブルもRLS未設定であり、anonキーでの書き込みが可能な状態である

> システム運用者として、マスターデータテーブルにRLSポリシーを設定して、不正な改ざんをDB層で防止したい。なぜならマスターデータがanonキーでの書き込みが可能な状態だから。

## Acceptance Criteria

### AC-1: 記事関連テーブルRLS

- [ ] WHILE scp_articles, scp_embeddings テーブルがアクセスされる際
      THE SYSTEM SHALL RLSが有効化されている
      AND SELECT は全ユーザーに許可される
      AND INSERT, UPDATE, DELETE は `auth.role() = 'service_role'` のみ許可される

### AC-2: タグ関連テーブルRLS

- [ ] WHILE tags, tag_dictionary, article_tags, tag_localizations テーブルがアクセスされる際
      THE SYSTEM SHALL RLSが有効化されている
      AND SELECT は全ユーザーに許可される
      AND INSERT, UPDATE, DELETE は `auth.role() = 'service_role'` のみ許可される

### AC-3: 言語・パイプライン関連テーブルRLS

- [ ] WHILE supported_languages, pipeline_runs, retry_queue テーブルがアクセスされる際
      THE SYSTEM SHALL RLSが有効化されている
      AND SELECT は全ユーザーに許可される
      AND INSERT, UPDATE, DELETE は `auth.role() = 'service_role'` のみ許可される

### AC-4: マイグレーションファイル

- [ ] `supabase/migrations/` に新規マイグレーションファイルが作成されている
      AND `supabase db push` で適用可能である

### AC-5: 既存機能への影響なし

- [ ] WHEN RLS設定後にデータパイプライン（クローラー・タグ付け等）を実行した際
      THEN service_roleキーによるアクセスは全て正常に動作する

## 設計

### RLSポリシーパターン

visitorデータテーブル（009-01-01）と同じパターンを適用。

```sql
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "{table_name}_select"
  ON {table_name} FOR SELECT USING (true);

CREATE POLICY "{table_name}_insert"
  ON {table_name} FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "{table_name}_update"
  ON {table_name} FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "{table_name}_delete"
  ON {table_name} FOR DELETE
  USING (auth.role() = 'service_role');
```

### 対象テーブル

| テーブル            | 用途                 | カテゴリ     |
| ------------------- | -------------------- | ------------ |
| scp_articles        | SCP記事データ        | 記事         |
| scp_embeddings      | 記事埋め込みベクトル | 記事         |
| tags                | タグマスター         | タグ         |
| tag_dictionary      | タグ辞書             | タグ         |
| article_tags        | 記事-タグ関連        | タグ         |
| tag_localizations   | タグローカライズ     | タグ         |
| supported_languages | 対応言語マスター     | 言語         |
| pipeline_runs       | パイプライン実行履歴 | パイプライン |
| retry_queue         | リトライキュー       | パイプライン |

### 注意事項

- `article_translations` は既にRLS設定済みのためスキップ
- RPC関数（`search_similar_articles`等）は `SECURITY DEFINER` で定義済みのため、RLS設定の影響を受けない

## テストケース

```typescript
describe("マスターデータテーブルRLS設定", () => {
  it("scp_articles テーブルにRLSが有効化されている", () => {
    // RLS有効状態を確認
  });

  it("service_roleキーでscp_articlesへの書き込みが可能", () => {
    // service_roleクライアントでINSERTが成功すること
  });

  it("anonキーでscp_articlesへの書き込みが拒否される", () => {
    // anonクライアントでINSERTを試みた場合、エラーが返ること
  });

  it("9テーブル全てにRLSポリシーが設定されている", () => {
    // 全対象テーブルのRLS有効状態を一括確認
  });
});
```

## 完了確認

- 確認日: （完了時に記入）
- 確認者: （完了時に記入）
- 備考: （完了時に記入）

## 参照ドキュメント

- [article_translations RLS実装例](../../../supabase/migrations/20260131000001_create_article_translations.sql)
- [初期スキーマ](../../../supabase/migrations/20241231000000_poc_schema.sql)
