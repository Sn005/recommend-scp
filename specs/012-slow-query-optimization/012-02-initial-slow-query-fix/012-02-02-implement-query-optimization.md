---
id: "012-02-02"
epic_id: "012"
story_id: "012-02"
epic_title: "スロークエリ最適化"
story_title: "初回スロークエリ対応"
title: "スロークエリ改善実装"
status: "completed"
created_at: "2026-02-15"
updated_at: "2026-02-15"
completed_at: "2026-02-21"
---

# Subtask: スロークエリ改善実装

## 親Story

[012-02: 初回スロークエリ対応](./012-02-initial-slow-query-fix.md)

## ユーザーストーリー

**ペルソナ**: 開発者（プロジェクトオーナー）
**目的**: 分析で特定されたスロークエリに対してインデックス追加・クエリ書き換え等の改善を実装する
**価値**: スロークエリが解消され、APIパフォーマンスが目標値以内に収まる
**理由**: 検出されたボトルネックを確実に解消し、ユーザー体験を改善したい

> 開発者として、分析で特定されたスロークエリに対して改善を実装して、APIパフォーマンスを目標値以内に改善したい。なぜなら検出されたボトルネックを確実に解消しユーザー体験を改善したいから。

## Acceptance Criteria

- [x] WHEN スロークエリの改善方針が決定された際
      GIVEN インデックス追加が必要な場合
      THEN マイグレーションファイルが `supabase/migrations/` に命名規則に従って作成されている
      AND `CREATE INDEX` 文が適切なカラム・インデックスタイプで記述されている

- [x] WHEN RPC関数の最適化が必要な場合
      GIVEN 関数本体の書き換えが改善方針に含まれている場合
      THEN `DROP FUNCTION IF EXISTS` + `CREATE OR REPLACE FUNCTION` パターンで安全に更新されている
      AND 入出力の型（引数・戻り値）が変更されていない

- [x] WHILE マイグレーションを作成している間
      THE SYSTEM SHALL 既存のテストが全て通過する状態を保つ

## 設計

### マイグレーションファイル命名規則

```
supabase/migrations/YYYYMMDD000001_optimize_[対象]_[改善内容].sql
```

### 想定される改善パターン

| パターン             | 適用場面                              | マイグレーション例                          |
| -------------------- | ------------------------------------- | ------------------------------------------- |
| インデックス追加     | WHERE句・JOIN条件にインデックスがない | `CREATE INDEX idx_xxx ON table(column)`     |
| 複合インデックス追加 | 複数カラムのWHERE句                   | `CREATE INDEX idx_xxx ON table(col1, col2)` |
| クエリ書き換え       | 非効率なサブクエリ・JOIN              | RPC関数内のSQL最適化                        |
| RPC関数最適化        | ベクトル検索系の実行計画が非効率      | フィルタ順序変更、不要カラム削除            |

### 技術的制約

- RPC関数の引数・戻り値の型は変更しない（入出力互換性維持）
- `DROP FUNCTION IF EXISTS` + `CREATE OR REPLACE FUNCTION` パターンを使用
- マイグレーションファイルにはコメントで「Why」を記述

## 実装状況

- **status**: completed

## 完了確認

- 確認日: 2026-02-21
- 確認者: Claude
- 備考: 改善A〜G全て実装完了。code-reviewerレビュー指摘（翻訳フィルタリグレッション・search_path欠落）も修正済み。

## 参照ドキュメント

- [012-02-01: pg_stat_statementsデータ分析](./012-02-01-analyze-pg-stat-statements.md)
- [対応方針ドキュメント](../../../docs/operations/slow-query-optimization.md)
