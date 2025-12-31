# CLAUDE.md

このファイルはClaude Code (claude.ai/code) がこのプロジェクトで作業する際のガイダンスを提供します。

## プロジェクト概要

このリポジトリは **仕様駆動開発（SDD: Spec-Driven Development）** のテンプレートです。
EPIC → Story → Subtaskの3階層構造で、ACベースの品質管理を行います。

## ドキュメント構成

```
.ai/                    # 汎用ドキュメント（どのAIでも利用可能）
├── SPEC_FORMAT.md      # 仕様フォーマット定義
├── WORKFLOW.md         # ワークフロー定義
└── PROMPT_TEMPLATE.md  # 他AI用プロンプトテンプレート

.claude/                # Claude専用
├── CLAUDE.md           # このファイル
└── skills/
    └── spec-workflow/  # 自動発動ワークフローSkill

specs/                  # 仕様書本体
├── epic-list.md        # EPIC一覧
└── {epic-id}/
    ├── {epic-id}.md    # EPIC定義
    ├── story-list.md   # Story一覧
    └── {story-id}/
        ├── {story-id}.md      # Story定義
        ├── subtask-list.md    # Subtask一覧
        └── {subtask-id}.md    # Subtask定義
```

## Claudeへの指示

### 必須実行フロー

1. **Subtask開始前**
   - 該当Subtaskファイル（`specs/{epic-id}/{story-id}/{subtask-id}.md`）を読み込む
   - ユーザーストーリーとACを確認
   - ユーザーに「このACで進めますか？」と確認

2. **実装中**
   - TDD厳守: Red → Green → Refactor
   - ACの範囲内のみ実装
   - スコープ外は提案のみ（実装しない）

3. **完了時**
   - 全ACをチェック
   - ステータスを更新（status: "completed"）
   - 次のSubtaskを提示

### 基本ルール

- 仕様ファースト: ACなしで実装を開始しない
- TDD厳守: テストを先に書く
- スコープ管理: ACに記載のない機能は実装しない
- 完了確認: 全ACを満たしたことを確認してから完了とする

### Skills自動発動

`spec-workflow` Skillが以下のキーワードで自動発動します：

- 実装して、作成して、開発して
- Subtask開始、Story開始
- EPIC、Story、Subtaskへの言及

### 禁止事項

- ACなしでの実装開始
- テストなしの実装（TDD違反）
- スコープ外の「ついでに」実装
- ユーザー確認なしの仕様変更

## 学習記録

（プロジェクト固有の知見をここに蓄積）
