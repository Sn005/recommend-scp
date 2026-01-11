# EPIC-002: 開発環境品質基盤

## 概要

AI開発体制において、コード品質を自動的に担保するための基盤を整備する。
ESLint/Prettier によるコード品質チェック、lefthook によるコミットフック、GitHub Actions による CI を構築する。

## ユーザーストーリー

**ペルソナ**: AI開発者（Claude Code）/ 人間開発者
**目的**: コード品質を自動的に担保し、一貫したコーディングスタイルを維持する
**価値**: AIが生成するコードの品質を自動検証し、人間のレビュー負担を軽減
**理由**: 本格実装フェーズに入る前に、品質基盤を整備しておきたい

## Acceptance Criteria（EPICレベル）

- [ ] `pnpm lint` でESLint v9（Flat Config）が実行される
- [ ] `pnpm format` でPrettierがコードをフォーマットする
- [ ] `git commit` 時にlefthookがlint/formatを自動実行する
- [ ] `git commit` 時にConventional Commits形式が強制される
- [ ] PRに対してGitHub Actions CIが自動実行される
- [ ] CIでテストカバレッジレポートが生成される

## 技術スタック

| ツール | バージョン | 用途 |
|--------|-----------|------|
| ESLint | v9.x | Linting（Flat Config） |
| typescript-eslint | v8.x | TypeScript対応 |
| Prettier | v3.x | コードフォーマット |
| lefthook | 最新 | Gitフック管理（npm版） |
| commitlint | v20.x | コミットメッセージ検証 |

## 関連Story

- [Story 002-01: ESLint + Prettier設定](./002-01-lint/002-01-lint.md)
- [Story 002-02: コミットフック設定](./002-02-hooks/002-02-hooks.md)
- [Story 002-03: GitHub Actions CI設定](./002-03-ci/002-03-ci.md)

## ステータス

- **status**: pending
- **開始日**: -
- **完了日**: -
