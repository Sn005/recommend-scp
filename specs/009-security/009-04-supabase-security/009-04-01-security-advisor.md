---
id: "009-04-01"
epic_id: "009"
story_id: "009-04"
epic_title: "セキュリティ強化"
story_title: "Supabaseセキュリティ設定"
title: "Security Advisorアラート対応"
status: "completed"
created_at: "2026-02-15"
updated_at: "2026-02-15"
completed_at: null
---

# Subtask: Security Advisorアラート対応

## 親Story

[009-04: Supabaseセキュリティ設定](./009-04.md)

## ユーザーストーリー

**ペルソナ**: システム運用者
**目的**: Supabase Security Advisorの全アラートを確認し、対応する
**価値**: Supabaseのセキュリティベストプラクティスに完全準拠する
**理由**: 未対応のセキュリティアラートがプラットフォームレベルのリスクとなっている

> システム運用者として、Supabase Security Advisorの全アラートを確認・対応して、プラットフォームレベルのリスクを排除したい。なぜなら未対応アラートがセキュリティリスクとなっているから。

## Acceptance Criteria

### AC-1: アラート一覧の確認

- [x] Supabase DashboardのSecurity Advisor画面で全アラートを確認している
      AND 各アラートの内容・重要度が記録されている

### AC-2: アラートへの対応

- [x] WHEN 各アラートに対して対応方針を決定した際
      THEN 以下のいずれかの状態にする: - **Resolved**: 技術的に修正・対応完了 - **Acknowledged**: 意図的に現状維持（理由を記録）

### AC-3: 対応記録

- [x] 各アラートに対する対応内容が以下の形式で記録されている: - アラート名 - 重要度（Critical / Warning / Info）- 対応方針（Resolved / Acknowledged）- 対応内容または Acknowledged 理由 - 対応日

## 設計

### 想定されるアラートカテゴリ

| カテゴリ     | 想定アラート          | 対応方針（予想）                         |
| ------------ | --------------------- | ---------------------------------------- |
| RLS          | テーブルにRLSが未設定 | Resolved（009-01で対応）                 |
| 認証         | MFA未設定             | Acknowledged（匿名アーキテクチャのため） |
| バックアップ | PITR未設定            | Acknowledged or Resolved（プランによる） |
| ネットワーク | IP制限未設定          | Acknowledged（開発段階のため）           |

### 対応記録テンプレート

```markdown
## Security Advisor 対応記録

### アラート 1: [アラート名]

- **重要度**: Critical / Warning / Info
- **カテゴリ**: RLS / Auth / Backup / Network / Other
- **対応方針**: Resolved / Acknowledged
- **対応内容**: [修正内容 or 現状維持の理由]
- **対応日**: YYYY-MM-DD
- **関連Subtask**: 009-01-01 等（該当する場合）
```

### 作業フロー

```
1. ユーザーからアラート内容を共有してもらう
2. 各アラートを分類（Resolved対象 / Acknowledged対象）
3. Resolved対象は技術的に対応（マイグレーション・設定変更等）
4. Acknowledged対象は理由を記録
5. 全アラートの対応状況を本specファイルに追記
```

## テストケース

```typescript
describe("Security Advisorアラート対応", () => {
  it("全アラートが確認・記録されている", () => {
    // 対応記録セクションに全アラートが記載されていること
  });

  it("各アラートがResolved または Acknowledged状態である", () => {
    // 未対応のアラートが残っていないこと
  });
});
```

## 対応記録

### アラート 1: function_search_path_mutable — get_table_columns

- **重要度**: Warning
- **カテゴリ**: Security
- **対応方針**: Resolved
- **対応内容**: `SET search_path = 'public'` を関数定義に追加。SECURITY DEFINER関数のため、search_pathが呼び出し元に依存すると偽テーブルへの誘導リスクがある。search_pathを固定して攻撃経路を遮断。
- **対応日**: 2026-02-17
- **マイグレーション**: `20260217000001_fix_function_search_path.sql`

### アラート 2: function_search_path_mutable — get_table_indexes

- **重要度**: Warning
- **カテゴリ**: Security
- **対応方針**: Resolved
- **対応内容**: `SET search_path = 'public'` を関数定義に追加。SECURITY DEFINER関数のため、アラート1と同じ理由で対応。
- **対応日**: 2026-02-17
- **マイグレーション**: `20260217000001_fix_function_search_path.sql`

### アラート 3: function_search_path_mutable — search_tag_by_alias

- **重要度**: Warning
- **カテゴリ**: Security
- **対応方針**: Resolved
- **対応内容**: `SET search_path = 'public'` を関数定義に追加。SECURITY DEFINER関数であり、tag_dictionary/tag_localizationsを参照するため、偽テーブルへの誘導リスクがある。
- **対応日**: 2026-02-17
- **マイグレーション**: `20260217000001_fix_function_search_path.sql`

### アラート 4: function_search_path_mutable — update_updated_at

- **重要度**: Warning
- **カテゴリ**: Security
- **対応方針**: Resolved
- **対応内容**: `SET search_path = 'public'` をトリガー関数に追加。トリガー関数はテーブル更新のたびに呼ばれるため、search_path固定が望ましい。
- **対応日**: 2026-02-17
- **マイグレーション**: `20260217000001_fix_function_search_path.sql`

### アラート 5: function_search_path_mutable — search_similar_articles

- **重要度**: Warning
- **カテゴリ**: Security
- **対応方針**: Resolved
- **対応内容**: `SET search_path = 'public'` を追加。scp_embeddings/scp_articlesを参照しており、偽テーブルへの誘導でデータ漏洩リスクがある。
- **対応日**: 2026-02-17
- **マイグレーション**: `20260217000001_fix_function_search_path.sql`

### アラート 6: function_search_path_mutable — search_articles_by_embedding

- **重要度**: Warning
- **カテゴリ**: Security
- **対応方針**: Resolved
- **対応内容**: `SET search_path = 'public'` を追加。Supabase RPCとして外部公開されており、scp_articles/article_translationsを参照するため、search_path固定は必須。
- **対応日**: 2026-02-17
- **マイグレーション**: `20260217000001_fix_function_search_path.sql`

### アラート 7: function_search_path_mutable — search_articles_by_unexplored_tags

- **重要度**: Warning
- **カテゴリ**: Security
- **対応方針**: Resolved
- **対応内容**: `SET search_path = 'public'` を追加。アラート6と同じ理由。
- **対応日**: 2026-02-17
- **マイグレーション**: `20260217000001_fix_function_search_path.sql`

### アラート 8: function_search_path_mutable — search_adjacent_articles

- **重要度**: Warning
- **カテゴリ**: Security
- **対応方針**: Resolved
- **対応内容**: `SET search_path = 'public'` を追加。内部でsearch_articles_by_embeddingを呼び出すが、関数自体のsearch_pathも固定が必要。
- **対応日**: 2026-02-17
- **マイグレーション**: `20260217000001_fix_function_search_path.sql`

### アラート 9: function_search_path_mutable — get_object_class

- **重要度**: Warning
- **カテゴリ**: Security
- **対応方針**: Resolved
- **対応内容**: `SET search_path = 'public'` を追加。tag_dictionaryを参照しており、偽テーブルへの誘導リスクがある。
- **対応日**: 2026-02-17
- **マイグレーション**: `20260217000001_fix_function_search_path.sql`

### アラート 10: extension_in_public — vector

- **重要度**: Warning
- **カテゴリ**: Security
- **対応方針**: Acknowledged
- **対応内容**: vector拡張がpublicスキーマにインストールされているが、extensionsスキーマへの移行は既存のインデックス（HNSW/IVFFlat）、RPC関数（vector型パラメータ）、scp_articlesテーブル（embedding列）すべてに影響する大規模変更となる。Supabase公式ドキュメントでも既存プロジェクトでの移行はリスクが大きいと案内されている。実害リスクが低い（攻撃にはスキーマ作成権限が必要）ため、現状維持とする。
- **対応日**: 2026-02-17

## 実装状況

- **status**: completed

## 完了確認

- 確認日: 2026-02-17
- 確認者: Claude Code
- 備考: function_search_path_mutable 9件を Resolved、extension_in_public 1件を Acknowledged

## 参照ドキュメント

- [Supabase Security Advisor](https://supabase.com/docs/guides/platform/security-advisor)
- [009-01-01: visitorデータテーブルRLS設定](../009-01-rls/009-01-01-visitor-tables-rls.md)
- [009-01-02: マスターデータテーブルRLS設定](../009-01-rls/009-01-02-master-tables-rls.md)
