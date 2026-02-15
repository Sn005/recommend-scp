---
id: "012-02"
epic_id: "012"
epic_title: "スロークエリ最適化"
title: "初回スロークエリ対応"
status: "pending"
created_at: "2026-02-15"
updated_at: "2026-02-15"
---

# Story: 初回スロークエリ対応

## 親EPIC

[012: スロークエリ最適化](../012-slow-query-optimization.md)

## ユーザーストーリー

**ペルソナ**: 開発者（プロジェクトオーナー）
**目的**: Supabaseダッシュボードの pg_stat_statements データに基づきスロークエリを分析・改善・検証する
**価値**: 検出されたスロークエリが解消され、APIパフォーマンスが改善される
**理由**: ユーザー影響が明確なクエリを早急に改善し、データ増加に備えたい

> 開発者として、pg_stat_statements データに基づきスロークエリを分析・改善・検証して、検出されたスロークエリを解消しAPIパフォーマンスを改善したい。なぜならユーザー影響が明確なクエリを早急に改善し、データ増加に備えたいから。

## Acceptance Criteria

- [ ] WHEN pg_stat_statements データが共有された際
      GIVEN スロークエリが1件以上特定された場合
      THEN 各クエリの実行計画分析と対応優先度が判定されている

- [ ] WHEN スロークエリの改善方針が決定された際
      GIVEN インデックス追加またはクエリ書き換えが必要な場合
      THEN マイグレーションファイルが `supabase/migrations/` に作成されている
      AND 既存のAPI入出力互換性が維持されている

- [ ] WHEN 改善マイグレーションが適用された後
      GIVEN 改善対象のクエリが存在する場合
      THEN 対応記録が `docs/slow-query-optimization.md` に追記されている
      AND 各改善に「Why（なぜその対応を選択したか）」が記録されている

## 関連Subtask

- [012-02-01: pg_stat_statementsデータ分析・優先度判定](./012-02-01-analyze-pg-stat-statements.md)
- [012-02-02: スロークエリ改善実装](./012-02-02-implement-query-optimization.md)
- [012-02-03: 改善効果の検証・記録](./012-02-03-verify-and-document.md)

## 備考

本Storyは「初回」の対応サイクル。将来新たなスロークエリが検出された場合、同じパターンで Story 012-03, 012-04... として追加する。
