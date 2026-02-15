---
id: "009-01-01"
epic_id: "009"
story_id: "009-01"
epic_title: "セキュリティ強化"
story_title: "RLS拡充・DB層セキュリティ"
title: "visitorデータテーブルRLS設定"
status: "pending"
created_at: "2026-02-15"
updated_at: "2026-02-15"
completed_at: null
---

# Subtask: visitorデータテーブルRLS設定

## 親Story

[009-01: RLS拡充・DB層セキュリティ](./009-01.md)

## ユーザーストーリー

**ペルソナ**: システム運用者
**目的**: visitorに紐づくデータテーブルにRLSポリシーを設定する
**価値**: ユーザーの閲覧履歴・フィードバック・お気に入り等の個人データがDB層で保護される
**理由**: これらのテーブルにはユーザーの行動データが格納されており、不正アクセスから保護する必要がある

> システム運用者として、visitorに紐づくデータテーブルにRLSポリシーを設定して、個人データをDB層で保護したい。なぜならユーザーの行動データが不正アクセスから保護される必要があるから。

## Acceptance Criteria

### AC-1: visitors テーブルRLS

- [ ] WHILE visitors テーブルがアクセスされる際
      THE SYSTEM SHALL RLSが有効化されている
      AND SELECT は全ユーザーに許可される（`USING (true)`）
      AND INSERT は `auth.role() = 'service_role'` のみ許可される
      AND UPDATE は `auth.role() = 'service_role'` のみ許可される
      AND DELETE は `auth.role() = 'service_role'` のみ許可される

### AC-2: view_history テーブルRLS

- [ ] WHILE view_history テーブルがアクセスされる際
      THE SYSTEM SHALL RLSが有効化されている
      AND SELECT, INSERT, UPDATE, DELETE に対して visitors テーブルと同じポリシーが適用される

### AC-3: feedback テーブルRLS

- [ ] WHILE feedback テーブルがアクセスされる際
      THE SYSTEM SHALL RLSが有効化されている
      AND SELECT, INSERT, UPDATE, DELETE に対して visitors テーブルと同じポリシーが適用される

### AC-4: recommendation_log テーブルRLS

- [ ] WHILE recommendation_log テーブルがアクセスされる際
      THE SYSTEM SHALL RLSが有効化されている
      AND SELECT, INSERT, UPDATE, DELETE に対して visitors テーブルと同じポリシーが適用される

### AC-5: favorites テーブルRLS

- [ ] WHILE favorites テーブルがアクセスされる際
      THE SYSTEM SHALL RLSが有効化されている
      AND SELECT, INSERT, UPDATE, DELETE に対して visitors テーブルと同じポリシーが適用される

### AC-6: マイグレーションファイル

- [ ] `supabase/migrations/` に新規マイグレーションファイルが作成されている
      AND `supabase db push` で適用可能である

### AC-7: 既存機能への影響なし

- [ ] WHEN RLS設定後にAPIサーバー経由で各エンドポイントを実行した際
      THEN service_roleキーによるアクセスは全て正常に動作する

## 設計

### RLSポリシーパターン（article_translations踏襲）

```sql
-- テーブルごとに以下を適用
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

| テーブル           | 用途               | visitor_id参照           |
| ------------------ | ------------------ | ------------------------ |
| visitors           | ユーザー嗜好データ | 自身のvisitor_id         |
| view_history       | 記事閲覧履歴       | FK → visitors.visitor_id |
| feedback           | Like/Dislike       | FK → visitors.visitor_id |
| recommendation_log | 推薦履歴           | FK → visitors.visitor_id |
| favorites          | お気に入り         | FK → visitors.visitor_id |

## テストケース

```typescript
describe("visitorデータテーブルRLS設定", () => {
  it("visitors テーブルにRLSが有効化されている", () => {
    // supabase inspectまたはSQLクエリでRLS有効状態を確認
  });

  it("service_roleキーでvisitorsテーブルへの書き込みが可能", () => {
    // service_roleクライアントでINSERT/UPDATE/DELETEが成功すること
  });

  it("anonキーでvisitorsテーブルへの書き込みが拒否される", () => {
    // anonクライアントでINSERTを試みた場合、エラーが返ること
  });

  it("anonキーでvisitorsテーブルのSELECTが可能", () => {
    // anonクライアントでSELECTが成功すること
  });

  it("5テーブル全てにRLSポリシーが設定されている", () => {
    // visitors, view_history, feedback, recommendation_log, favorites
  });
});
```

## 完了確認

- 確認日: （完了時に記入）
- 確認者: （完了時に記入）
- 備考: （完了時に記入）

## 参照ドキュメント

- [article_translations RLS実装例](../../../supabase/migrations/20260131000001_create_article_translations.sql)
- [visitorテーブル定義](../../../supabase/migrations/20250120000001_create_visitor_tables.sql)
