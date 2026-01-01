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

### ⚠️ 最重要ルール: ステータス更新の徹底

**Subtask/Story/EPIC完了時は、必ず以下の全ファイルでステータスを `completed` に更新すること。**

| 完了レベル | 更新対象ファイル |
|-----------|------------------|
| Subtask完了 | `subtask-list.md` の該当行 |
| Story完了 | `story-list.md` の該当行 |
| EPIC完了 | `epic-list.md` の該当行 |

```markdown
# 更新例（subtask-list.md）
| ID | 名前 | ステータス | 依存 |
|----|------|----------|------|
| [001-01-01](...) | モノレポ初期化 | pending → completed | - |
```

**このルールを守らないと、プロジェクトの進捗状況が正確に把握できなくなります。**

---

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
   - **一覧ファイル（subtask-list.md, story-list.md）のステータスも更新**
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

## コーディングルール

### Import文

- **`.js` 拡張子は使用しない**: 特別な事情がない限り、import文に `.js` 拡張子を付けない
  - 良い例: `import { foo } from "./lib/bar"`
  - 悪い例: `import { foo } from "./lib/bar.js"`
- tsconfig.jsonで `moduleResolution: "Bundler"` を使用しているため、拡張子なしで解決可能

### 変数と制御フロー

- **変数の再代入は避ける**: `let` より `const` を優先し、イミュータブルなコードを書く
- **for文での再代入は避ける**: `map` / `filter` / `reduce` などの高階関数を使用
  - 良い例: `const doubled = numbers.map(n => n * 2)`
  - 悪い例: `let result = []; for (const n of numbers) { result.push(n * 2); }`
- 副作用のない純粋関数を推奨

### 環境変数

- **dotenvは `src/lib/env.ts` で一元管理**: 環境変数の読み込みと検証は env.ts に集約
- スクリプトのエントリポイントでは `import "../src/lib/env"` を最初にインポート
- `process.env` への直接アクセスではなく、`env` オブジェクト経由でアクセス

### TypeScript

- 型定義は `src/types.ts` に集約
- 明示的な型アノテーションを推奨
- `any` 型の使用は避ける

## 学習記録

（プロジェクト固有の知見をここに蓄積）
