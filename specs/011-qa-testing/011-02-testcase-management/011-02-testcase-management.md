# Story 011-02: テストケース管理

## 概要

CSV/TSV形式でテストケースを管理し、Playwrightから読み込んで実行できるエンジンを構築する。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: テストケースをCSV形式で管理し、動的にPlaywrightテストとして実行する
**価値**: Git差分が見やすく、AIが生成・更新しやすい形式でテストを管理できる
**理由**: テストケースの追加・変更をコードレスで行いたい

## 受け入れ条件（Storyレベル）

- [ ] CSV/TSVスキーマが定義されている
- [ ] CSVファイルをパースしてTestCase型に変換できる
- [ ] steps列のJSONをPlaywright操作として実行できる

## 関連Subtask

- [011-02-01: CSV/TSVスキーマ定義](./011-02-01-csv-schema.md)
- [011-02-02: CSVパーサー実装](./011-02-02-csv-parser.md)
- [011-02-03: ステップ実行エンジン実装](./011-02-03-step-executor.md)

## 技術メモ

- CSVはJSON埋め込み形式（steps列）
- パーサーは `apps/web/e2e/lib/csv-parser.ts`
- 実行エンジンは `apps/web/e2e/lib/step-executor.ts`
