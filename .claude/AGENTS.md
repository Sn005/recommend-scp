# サブエージェント活用ガイド

> CLAUDE.mdから分離。各サブエージェントの役割と発火タイミングを定義。

各Skill（`/spec`, `spec-workflow`）のSKILL.mdにサブエージェントの発火タイミングと詳細が記載されている。ここではプロジェクト横断の概要のみ記載。

| サブエージェント    | 役割                                 | 発火元Skill         |
| ------------------- | ------------------------------------ | ------------------- |
| **spec-reviewer**   | EARS記法・AC品質チェック             | `/spec`             |
| **architect**       | 既存パターン整合性・技術選定レビュー | `/spec`（条件付き） |
| **test-strategist** | ACからテストケース導出               | `spec-workflow`     |
| **code-reviewer**   | AC適合性・コード品質チェック         | `spec-workflow`     |
| **quality-gate**    | 全AC充足・テスト通過の最終確認       | 全PR（必須）        |

## 品質ゲート（スキップ不可）

| タイミング | サブエージェント  | 理由                                               |
| ---------- | ----------------- | -------------------------------------------------- |
| TDD開始前  | `test-strategist` | ACからテストケースを導出し、テスト設計の品質を担保 |
| PR作成前   | `code-reviewer`   | AC適合性・コード品質・セキュリティを検証           |
| PRマージ前 | `quality-gate`    | 全AC充足・テスト通過の最終確認                     |

## エージェント定義ファイル

各エージェントの詳細な指示は `.claude/agents/` ディレクトリに格納:

- `.claude/agents/architect.md`
- `.claude/agents/code-reviewer.md`
- `.claude/agents/quality-gate.md`
- `.claude/agents/spec-reviewer.md`
- `.claude/agents/test-strategist.md`
