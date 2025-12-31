# ATDD-SDD: 仕様駆動開発テンプレート

AI駆動開発における「仕様駆動開発（Spec-Driven Development）」のテンプレートリポジトリです。

## 概要

**フェーズ → タスク → アクション** の3階層構造で仕様を管理し、各レベルにAcceptance Criteria（AC）とユーザーストーリーを定義することで、AIの暴走を防ぎ品質を高める開発手法です。

```
📋 フェーズ（Phase）
  👤 ユーザーストーリー + AC
  └── 🎯 タスク（Task）
        👤 ユーザーストーリー + AC
      └── ⚡ アクション（Action）
            👤 ユーザーストーリー + AC
```

## 特徴

- **ACによるスコープ明確化**: AIが「何をすべきか」「何をすべきでないか」を判断可能
- **暴走防止**: ACを満たしたら完了という明確な境界線
- **TDDとの親和性**: ACからテストケースを直接導出可能
- **AIエージェント非依存**: どのAI（Claude, GPT-4, Gemini等）でも使用可能
- **Claude最適化**: Skills機能で自動発動・ワークフロー強制

## ディレクトリ構成

```
.ai/                    # 汎用ドキュメント（どのAIでも利用可能）
├── SPEC_FORMAT.md      # 仕様フォーマット定義
├── WORKFLOW.md         # ワークフロー定義
└── PROMPT_TEMPLATE.md  # 他AI用プロンプトテンプレート

.claude/                # Claude専用拡張
├── CLAUDE.md           # プロジェクト指示
└── skills/
    └── spec-workflow/  # 自動発動ワークフローSkill

specs/                  # 仕様書本体
├── phases/             # フェーズ定義
├── tasks/              # タスク定義
└── actions/            # アクション定義
```

## 使い方

### 1. テンプレートをコピー

```bash
git clone https://github.com/your-org/atdd-sdd.git your-project
cd your-project
rm -rf .git
git init
```

### 2. 仕様を定義

1. `specs/phases/` にフェーズを定義
2. `specs/tasks/` にタスクを定義
3. `specs/actions/` にアクションを定義

各ファイルは [SPEC_FORMAT.md](.ai/SPEC_FORMAT.md) のフォーマットに従ってください。

### 3. AIで開発開始

#### Claude Codeの場合

Skills機能により自動発動します。タスクを指示するだけでOK：

```
「001-01-01の設定要件アクションを実装して」
```

#### 他のAI（GPT-4, Gemini等）の場合

[PROMPT_TEMPLATE.md](.ai/PROMPT_TEMPLATE.md) のテンプレートを使用してください：

```
[セッション開始時のプロンプトをコピペ]

## 実装するアクション
[specs/actions/xxx.md の内容をコピペ]
```

## Claude vs 他AI の差分

| 観点 | Claude | 他AI |
|------|--------|------|
| 発動方法 | 自動（Skills） | 手動（プロンプト） |
| ワークフロー強制力 | 高（Skill強制） | 中（AIが無視する可能性） |
| 毎タスクの手間 | 低 | 高（プロンプト作成） |
| コンテキスト管理 | @参照で効率的 | 全文コピペ |

詳細は [プランファイル](/.claude/plans/) を参照してください。

## ワークフロー

### 基本サイクル

```
1. タスク開始前
   - アクションファイルを読み込む
   - ACを確認
   - ユーザーに確認

2. TDD実装
   🔴 Red: ACからテストを導出、失敗確認
   🟢 Green: 最小限の実装
   🔵 Refactor: コード改善

3. 完了時
   - 全ACをチェック
   - ステータス更新
   - 次のアクション提示
```

### 禁止事項

- ACなしでの実装開始
- テストなしの実装（TDD違反）
- スコープ外の「ついでに」実装

## サンプル仕様

このテンプレートには以下のサンプル仕様が含まれています：

- **Phase 001**: 環境構築
  - **Task 001-01**: 共通設定整備
    - Action 001-01-01: 設定要件の確認と決定
    - Action 001-01-02: ESLint設定作成
    - Action 001-01-03: Prettier設定作成
  - **Task 001-02**: 基本アプリケーション作成

## ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [SPEC_FORMAT.md](.ai/SPEC_FORMAT.md) | 仕様ファイルのフォーマット定義 |
| [WORKFLOW.md](.ai/WORKFLOW.md) | ワークフロー詳細 |
| [PROMPT_TEMPLATE.md](.ai/PROMPT_TEMPLATE.md) | 他AI用プロンプトテンプレート |
| [CLAUDE.md](.claude/CLAUDE.md) | Claude専用プロジェクト指示 |

## ライセンス

MIT

## 貢献

Issue、Pull Requestを歓迎します。
