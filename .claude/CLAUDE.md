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

### ⚠️ 最重要ルール: Skill/サブエージェント自動発動（MUST）

**以下のキーワードが含まれる場合、MUST で該当Skillを発動すること。直接実装を始めてはならない。**

| キーワード                           | 発動するSkill   | 発動方法          |
| ------------------------------------ | --------------- | ----------------- |
| 「実装して」「開発して」「作成して」 | `spec-workflow` | Skill tool で発動 |
| Subtask IDへの言及（例: 002-01-01）  | `spec-workflow` | Skill tool で発動 |
| 「仕様を策定して」「specを作成して」 | `spec`          | Skill tool で発動 |

**サブエージェント使用タイミング（MUST）:**

| タイミング | サブエージェント  | 条件                          |
| ---------- | ----------------- | ----------------------------- |
| TDD開始前  | `test-strategist` | コード実装を伴うSubtaskの場合 |
| PR作成前   | `code-reviewer`   | impl/\* ブランチの場合        |
| PRマージ前 | `quality-gate`    | **全PR必須**                  |

**違反時の対応:**

- Skillを発動せずに実装を開始した場合 → 即座に中断し、Skillを発動
- サブエージェントを使用せずにPRを作成した場合 → PR作成前にcode-reviewer/quality-gateを実行

---

### ⚠️ 最重要ルール: ステータス更新の徹底

**Subtask/Story/EPIC完了時は、必ず以下の全ファイルでステータスを `completed` に更新すること。**

| 完了レベル  | 更新対象ファイル           |
| ----------- | -------------------------- |
| Subtask完了 | `subtask-list.md` の該当行 |
| Story完了   | `story-list.md` の該当行   |
| EPIC完了    | `epic-list.md` の該当行    |

```markdown
# 更新例（subtask-list.md）

| ID               | 名前           | ステータス          | 依存 |
| ---------------- | -------------- | ------------------- | ---- |
| [001-01-01](...) | モノレポ初期化 | pending → completed | -    |
```

**このルールを守らないと、プロジェクトの進捗状況が正確に把握できなくなります。**

---

### ⚠️ 最重要ルール: PR作成時のSpecチェックリスト確認

**PR作成前に、必ず対象Subtaskのspecファイルを確認し、完了済み項目にチェック `[x]` を入れること。**

#### 確認手順

1. **対象specファイルを開く**
   - `specs/{epic-id}/{story-id}/{subtask-id}.md`

2. **ACセクションの全項目を確認**
   - 完了している項目: `- [ ]` → `- [x]` に更新
   - 未完了の項目があればPR作成前に対応

3. **テストケースセクションも確認**
   - 完了している項目: `- [ ]` → `- [x]` に更新

4. **実装状況セクションを追加/更新**

   ```markdown
   ## 実装状況

   - **status**: completed
   ```

5. **一覧ファイルのステータスも更新**
   - `subtask-list.md` の該当行を `completed` に

#### チェック漏れ防止

PR作成時に以下を必ず実行:

```bash
# 対象specファイルに未チェック項目がないか確認
grep -n "\- \[ \]" specs/{epic-id}/{story-id}/{subtask-id}.md

# CLAUDE.md分割チェック（閾値超過時は分離）
wc -l .claude/CLAUDE.md  # 500行超で分離
sed -n '/^## 学習記録/,$p' .claude/CLAUDE.md | wc -l  # 50行超で分離
sed -n '/^## 学習記録/,$p' .claude/CLAUDE.md | grep -c "^###"  # 5項目超で分離
```

**チェック漏れはプロジェクトの品質管理を損なうため、絶対に避けること。**

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

## サブエージェント活用ガイド

SDDワークフローの各フェーズで、専門サブエージェントを活用して品質を担保します。

### SDDワークフローでの使用タイミング

| フェーズ | サブエージェント    | 使用タイミング                                         |
| -------- | ------------------- | ------------------------------------------------------ |
| 仕様策定 | **spec-reviewer**   | `/spec` 完了後、spec/\* ブランチのPR前に仕様をレビュー |
| 設計判断 | **architect**       | 新機能追加前、アーキテクチャ判断が必要な時             |
| TDD準備  | **test-strategist** | Subtask開始時、ACからテストケースを導出                |
| 実装完了 | **code-reviewer**   | impl/\* ブランチのPR前にコード品質をチェック           |
| マージ前 | **quality-gate**    | PRマージ前の最終確認（**必須**）                       |

### 各サブエージェントの役割

#### spec-reviewer（仕様レビュー）

- EARS記法の適切性チェック
- AC（受入条件）の品質・網羅性確認
- 仕様の曖昧さ・矛盾の検出

#### architect（アーキテクチャレビュー）

- 既存パターンとの整合性確認
- 依存関係の妥当性チェック
- 技術選定のレビュー

#### test-strategist（テスト戦略）

- ACからテストケースを導出
- エッジケース・境界値の洗い出し
- TDD開始前のテスト設計

#### code-reviewer（コードレビュー）

- AC適合性のチェック
- コード品質・セキュリティ確認
- テスト品質の検証

#### quality-gate（品質ゲート）

- 全AC充足の最終確認
- テスト通過の確認
- マージ可否の判定

### 使用例

```
# 仕様レビューが必要な場合
「spec-reviewerでこの仕様をレビューして」

# TDD開始前
「test-strategistでテスト戦略を立てて」

# PR作成前（必須）
「quality-gateでマージ前チェックを実行して」
```

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

### テストコード

- **⚠️ 最重要ルール: テストケース名は必ず日本語で記述する**
  - 良い例: `it("有効なJSONレスポンスをパースできる", ...)`
  - 悪い例: `it("should parse valid JSON response", ...)`
- `describe` ブロックの説明も日本語を推奨
- テストの意図が日本語で明確に伝わることを優先

### ログ出力

- **⚠️ 最重要ルール: `console.log` 禁止 → `createLogger` を使用**
  - `packages/pipeline/src/crawler/utils/logger.ts` の `createLogger` を必ず使用
  - ESLintで `no-console: "error"` が設定されており、違反するとビルドエラー
  - 良い例:
    ```typescript
    import { createLogger } from "./crawler/utils/logger";
    const logger = createLogger({ prefix: "[MyModule]" });
    logger.info("記事を取得中...");
    logger.error("取得に失敗:", error);
    ```
  - 悪い例:
    ```typescript
    console.log("記事を取得中..."); // ESLintエラー
    ```
- **例外: `scripts/` ディレクトリ内のCLIスクリプトでは `console` 使用可**
- ログメッセージは日本語で記述
- 技術的な固有名詞（Supabase, Embedding等）はそのまま使用可

## コミットメッセージ規約（Conventional Commits）

コミットメッセージは以下の形式に従うこと：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### type（必須）

| type       | 説明                                                 |
| ---------- | ---------------------------------------------------- |
| `feat`     | 新機能                                               |
| `fix`      | バグ修正                                             |
| `docs`     | ドキュメントのみの変更                               |
| `style`    | コードの意味に影響しない変更（空白、フォーマット等） |
| `refactor` | バグ修正でも機能追加でもないコード変更               |
| `perf`     | パフォーマンス改善                                   |
| `test`     | テストの追加・修正                                   |
| `chore`    | ビルドプロセスやツールの変更                         |

### scope（任意）

変更対象のモジュールやコンポーネント名
例: `feat(search):`, `fix(crawler):`

### 例

```
feat(search): ベクトル検索機能を追加
fix(tagging): タグ抽出時のnullチェックを修正
docs: README.mdにセットアップ手順を追記
chore: ESLint設定を追加
```

### 緊急時のフックスキップ

緊急時は `--no-verify` フラグでフックをスキップ可能（通常は非推奨）：

```bash
git commit -m "fix: 緊急修正" --no-verify
```

---

## CLAUDE.md分割方針

CLAUDE.mdが肥大化した場合の分割ルール。

### 閾値

| 対象               | 閾値              | アクション                |
| ------------------ | ----------------- | ------------------------- |
| CLAUDE.md全体      | **500行超**       | 下記優先度で分離          |
| 学習記録セクション | 50行超 or 5項目超 | `.claude/NOTES.md` に分離 |

### 分離優先度

| 優先度 | セクション                 | 分離先                    |
| ------ | -------------------------- | ------------------------- |
| 1      | 学習記録                   | `.claude/NOTES.md`        |
| 2      | サブエージェント活用ガイド | `.claude/AGENTS.md`       |
| 3      | コーディングルール         | `.claude/CODING_RULES.md` |

### コア（分離しない）

- プロジェクト概要
- ドキュメント構成
- Claudeへの指示

---

## 学習記録

> **分離基準**: 学習記録セクション50行超 or 5項目超、またはCLAUDE.md全体500行超で `.claude/NOTES.md` に分離

### 本格実装に向けた改善案

#### タグ辞書方式の導入（優先度: 高）

現在のタグ抽出はLLMプロンプトにタグ選択肢をハードコーディングしているが、本格実装では**DBでタグ辞書を管理**する方式を採用する。

**メリット:**

- 表記揺れ防止（辞書にあるタグのみ許可）
- 拡張性（新タグはDB追加のみでコード変更不要）
- 日本語化対応（辞書を日本語に変更するだけ）
- 同義語管理（`horror` → `ホラー` のマッピング）

**実装案:**

```sql
CREATE TABLE tag_dictionary (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,  -- 'object_class', 'genre', 'theme', 'format'
  value TEXT NOT NULL,     -- '安全', 'ホラー' など（日本語）
  aliases TEXT[],          -- ['Safe', 'safe'] など（同義語）
  description TEXT,
  UNIQUE(category, value)
);
```

**プロンプト生成:**

```typescript
const dictionary = await fetchTagDictionary();
const prompt = `タグを以下から選択: ${dictionary.genre.join(" | ")}`;
```

#### 多言語支部対応の拡張性設計（優先度: 中）

EPIC-003（データパイプライン本番化）では、将来の多言語支部対応（KO, CN, FR等）を見据えた拡張性を担保する。

**設計方針:**

| 項目         | 拡張性担保の方法                                                   |
| ------------ | ------------------------------------------------------------------ |
| 言語マスタ   | `supported_languages` テーブルで管理。新言語は1行INSERT            |
| 記事テーブル | `scp_articles.lang` は TEXT型で任意言語コード対応                  |
| クローラー   | `BranchCrawler` インターフェースで抽象化。支部別実装を差し替え可能 |
| タグ辞書     | `tag_localizations` テーブルで言語別ローカライズを分離管理         |

**新言語追加時の作業:**

1. `supported_languages` に1行追加
2. 新しい `XxxCrawler` クラス実装（〜200行）
3. `tag_localizations` にローカライズ追加
4. パイプライン設定で `lang: 'xx'` 指定

**見積もり:** 1-2日程度で新言語対応可能
