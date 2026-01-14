# Subtask-003-00-04: Spec修正

## 概要

003系specファイル内の `packages/poc` への参照を、適切なパッケージ（`packages/shared` または `packages/pipeline`）への参照に更新する。

## ユーザーストーリー

**ペルソナ**: 開発者

**目的**: specファイルが実際のコード配置と整合するよう更新する

**価値**: specを読んだ開発者が正しいファイルパスを参照できる

## スコープ

### 含む

- 003系specファイル（13ファイル）のパス参照更新
- EPIC-003のメインspec（003-data-pipeline.md）の成果物セクション更新

### 含まない

- 001系specファイルの更新（履歴として `packages/poc` 参照を維持）
- specの内容・ロジックの変更

## 依存関係

- 003-00-01, 003-00-02, 003-00-03 がすべて完了していること

## Acceptance Criteria

### パス参照更新

- [ ] WHEN 003系specファイルを更新する際
      GIVEN `packages/poc/src/crawler/` への参照がある場合
      THEN `packages/pipeline/src/crawler/` に変更される

- [ ] WHEN 003系specファイルを更新する際
      GIVEN `packages/poc/src/embedding/generate.ts` への参照がある場合
      THEN `packages/shared/src/embedding/generate.ts` に変更される（純粋ロジック）

- [ ] WHEN 003系specファイルを更新する際
      GIVEN `packages/poc/src/embedding/batch-processor.ts` への参照がある場合
      THEN `packages/pipeline/src/processing/batch-embedding.ts` に変更される（バッチ処理）

- [ ] WHEN 003系specファイルを更新する際
      GIVEN `packages/poc/src/tagging/extract.ts` への参照がある場合
      THEN `packages/shared/src/tagging/extract.ts` に変更される（純粋ロジック）

- [ ] WHEN 003系specファイルを更新する際
      GIVEN `packages/poc/src/tagging/tag-dictionary-manager.ts` への参照がある場合
      THEN `packages/shared/src/tagging/tag-dictionary-manager.ts` に変更される（共通処理）

- [ ] WHEN 003系specファイルを更新する際
      GIVEN `packages/poc/src/tagging/batch-processor.ts` への参照がある場合
      THEN `packages/pipeline/src/processing/batch-tagging.ts` に変更される（バッチ処理）

- [ ] WHEN 003系specファイルを更新する際
      GIVEN `packages/poc/src/search/` への参照がある場合
      THEN `packages/shared/src/search/` に変更される

- [ ] WHEN 003系specファイルを更新する際
      GIVEN `packages/poc/src/lib/` への参照がある場合
      THEN `packages/shared/src/lib/` に変更される

- [ ] WHEN 003系specファイルを更新する際
      GIVEN `packages/poc/src/migrations/` への参照がある場合
      THEN `packages/pipeline/src/migrations/` に変更される

### EPIC成果物更新

- [ ] WHEN 003-data-pipeline.md を更新する際
      GIVEN 成果物セクションに `packages/poc` への参照がある場合
      THEN 以下のように更新される: - `packages/poc/src/crawler/` → `packages/pipeline/src/crawler/` - `packages/poc/src/pipeline/` → `packages/pipeline/src/orchestrator/`

### 検証

- [ ] WHEN grep で確認する際
      GIVEN 003系specディレクトリを検索した場合
      THEN `packages/poc` への参照が0件である

```bash
grep -r "packages/poc" specs/003-data-pipeline/ | wc -l
# 期待値: 0
```

## 対象ファイル一覧

### 更新対象（13ファイル）

| ファイル                                                | 主な変更箇所                         |
| ------------------------------------------------------- | ------------------------------------ |
| `003-data-pipeline.md`                                  | 成果物セクション                     |
| `003-01-db-foundation/003-01-01-language-schema.md`     | テストファイルパス                   |
| `003-01-db-foundation/003-01-02-tag-dictionary.md`      | テストファイルパス                   |
| `003-01-db-foundation/003-01-03-pipeline-tables.md`     | テストファイルパス                   |
| `003-02-crawler/003-02-01-crawler-abstraction.md`       | 実装ファイルパス                     |
| `003-02-crawler/003-02-02-en-full-crawler.md`           | 実装ファイルパス                     |
| `003-02-crawler/003-02-03-diff-update.md`               | 実装ファイルパス                     |
| `003-03-processing/003-03-01-batch-embedding.md`        | 実装ファイルパス                     |
| `003-03-processing/003-03-02-tag-dictionary-manager.md` | 実装ファイルパス                     |
| `003-03-processing/003-03-03-tag-extraction.md`         | 実装ファイルパス                     |
| `003-04-orchestration/003-04-01-orchestrator.md`        | 実装ファイルパス                     |
| `003-04-orchestration/003-04-02-github-actions.md`      | `--filter poc` → `--filter pipeline` |
| `003-04-orchestration/003-04-03-notification-retry.md`  | 実装ファイルパス                     |

### 更新しない（7ファイル）

001系specファイルは履歴として `packages/poc` 参照を維持：

- `001-poc/001-poc.md`
- `001-poc/001-01-setup/001-01-01-monorepo-init.md`
- `001-poc/001-01-setup/001-01-setup.md`
- `001-poc/001-02-crawl/001-02-01-scp-crawler.md`
- `001-poc/001-03-embed/001-03-embed.md`
- `001-poc/001-03-embed/001-03-01-openai-embedding.md`
- `001-poc/001-04-tag/001-04-01-llm-tagging.md`

## パス変換ルール

### pipelineパッケージ（パイプライン固有処理）

| 旧パス                                          | 新パス                                                | 理由                               |
| ----------------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| `packages/poc/src/crawler/`                     | `packages/pipeline/src/crawler/`                      | パイプライン固有                   |
| `packages/poc/src/migrations/`                  | `packages/pipeline/src/migrations/`                   | パイプライン固有                   |
| `packages/poc/src/pipeline/`                    | `packages/pipeline/src/orchestrator/`                 | パイプライン固有（名称変更）       |
| `packages/poc/src/embedding/batch-processor.ts` | `packages/pipeline/src/processing/batch-embedding.ts` | バッチ処理（DBステータス管理含む） |
| `packages/poc/src/tagging/batch-processor.ts`   | `packages/pipeline/src/processing/batch-tagging.ts`   | バッチ処理（DBステータス管理含む） |

### sharedパッケージ（共通の純粋ロジック）

| 旧パス                                               | 新パス                                                  | 理由                        |
| ---------------------------------------------------- | ------------------------------------------------------- | --------------------------- |
| `packages/poc/src/embedding/generate.ts`             | `packages/shared/src/embedding/generate.ts`             | 純粋なEmbedding生成ロジック |
| `packages/poc/src/tagging/extract.ts`                | `packages/shared/src/tagging/extract.ts`                | 純粋なタグ抽出ロジック      |
| `packages/poc/src/tagging/tag-dictionary-manager.ts` | `packages/shared/src/tagging/tag-dictionary-manager.ts` | タグ辞書管理（共通）        |
| `packages/poc/src/search/`                           | `packages/shared/src/search/`                           | 検索機能（共通）            |
| `packages/poc/src/lib/`                              | `packages/shared/src/lib/`                              | 共通基盤                    |
| `packages/poc/src/types.ts`                          | `packages/shared/src/types.ts`                          | 共通型定義                  |

### CLIコマンド

| 旧コマンド                       | 新コマンド                   | 理由           |
| -------------------------------- | ---------------------------- | -------------- |
| `pnpm --filter poc pipeline:run` | `pnpm --filter pipeline run` | パッケージ変更 |

## テストケース

- [ ] 003系specディレクトリに `packages/poc` への参照が0件である
- [ ] 各specファイルのパスが実際のファイル配置と一致する
- [ ] markdownのリンクが壊れていない
