# Story-003-01: DB基盤拡張

## 概要

データパイプライン本番化に必要なデータベーススキーマを拡張する。
言語マスタ、タグ辞書、パイプライン実行管理テーブルを追加し、多言語対応の拡張性を担保する。

## ユーザーストーリー

**As a** 開発者
**I want** 本番運用に必要なDBスキーマを整備する
**So that** 多言語対応・タグ管理・実行履歴管理が可能になる

## Acceptance Criteria（概要）

- 言語マスタテーブル（`supported_languages`）の作成
- 記事テーブル（`scp_articles`）への言語・ステータスフィールド追加
- タグ辞書テーブル（`tag_dictionary`, `tag_localizations`）の作成
- パイプライン実行管理テーブル（`pipeline_runs`, `retry_queue`）の作成

## 関連Subtask

- [003-01-01: 言語マスタ・記事テーブル拡張](./003-01-01-language-schema.md)
- [003-01-02: タグ辞書テーブル構築](./003-01-02-tag-dictionary.md)
- [003-01-03: パイプライン実行管理テーブル](./003-01-03-pipeline-tables.md)
