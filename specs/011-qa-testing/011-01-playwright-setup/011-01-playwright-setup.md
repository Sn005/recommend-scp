# Story 011-01: Playwright環境構築

## 概要

Playwright環境を構築し、E2Eテストの基盤を整備する。data-testid属性の命名規則をESLintで強制し、GitHub ActionsでCI統合する。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: PlaywrightでE2Eテストを実行できる環境を構築する
**価値**: ブラウザベースの自動テストが可能になる
**理由**: リグレッション検知とUIフロー検証を自動化したい

## 受け入れ条件（Storyレベル）

- [ ] Playwrightがインストールされ、基本テストが実行できる
- [ ] data-testid属性の命名規則がESLintで検証される
- [ ] GitHub ActionsでE2Eテストが自動実行される

## 関連Subtask

- [011-01-01: Playwrightセットアップ](./011-01-01-playwright-init.md)
- [011-01-02: data-testid ESLintルール](./011-01-02-testid-eslint.md)
- [011-01-03: CI統合](./011-01-03-ci-integration.md)

## 技術メモ

- Playwrightは `apps/web/e2e/` に配置
- Chromiumのみ使用（MVP段階）
- Vitestの `exclude: ["e2e"]` は設定済み
