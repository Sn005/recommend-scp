# CLAUDE.md

このファイルはClaude Code (claude.ai/code) がこのプロジェクトで作業する際のガイダンスを提供します。

## プロジェクト概要

**SCPicks** — SCP Foundation記事のパーソナライズド推薦システム。
仕様駆動開発（SDD）で構築し、EPIC → Story → Subtaskの3階層構造でACベースの品質管理を行う。

**本番URL**: scpicks.app（Vercelホスティング）

### 技術スタック

| レイヤー       | 技術                                   | 備考                               |
| -------------- | -------------------------------------- | ---------------------------------- |
| フロントエンド | Next.js 16 + React 19 + Tailwind CSS 4 | App Router, Server Components      |
| バックエンド   | Hono 4.7（Node.js）                    | ドメイン別Colocation, RPC型安全    |
| データベース   | Supabase（PostgreSQL + pgvector）      | RLS有効, ベクトル検索              |
| キャッシュ     | Upstash Redis                          | 記事表示高速化                     |
| LLM            | OpenAI（Embedding + タグ抽出）         | text-embedding-3-small             |
| ビルド         | Turborepo + pnpm 10 + tsup             | モノレポ最適化                     |
| テスト         | Vitest（単体）+ Playwright（E2E）      | テストケース名は日本語必須         |
| CI/CD          | GitHub Actions                         | lint, type-check, build, test, E2E |
| ホスティング   | Vercel（Web + Functions）              | プレビューデプロイ対応             |

### モノレポ構成

> 構成を確認するには `tree -L 2 apps packages` を実行してください。

### 開発コマンド

```bash
pnpm dev            # Next.js + API 同時起動
pnpm build          # Turborepoビルド（依存解決付き）
pnpm lint           # ESLint
pnpm format         # Prettier（コミット前に必須）
pnpm type-check     # TypeScript型チェック
pnpm test           # Vitest
pnpm test:coverage  # カバレッジ付きテスト
pnpm pipeline       # データパイプライン実行
```

## ドキュメント構成

> 構成を確認するには `tree -L 3 .ai .claude specs --dirsfirst` を実行してください。

## Claudeへの指示

### ⚠️ 最重要ルール: アーキテクチャドキュメント参照（MUST）

**EPIC-005（バックエンドAPI）以降の実装時は、必ず以下のドキュメントを参照すること。**

| ドキュメント                 | パス                       | 参照タイミング               |
| ---------------------------- | -------------------------- | ---------------------------- |
| アーキテクチャ               | `.ai/architecture.md`      | 実装開始前、設計判断時       |
| コーディングガイドライン     | `.ai/coding-guidelines.md` | コード記述時                 |
| フロントエンドアーキテクチャ | `apps/web/ARCHITECTURE.md` | EPIC-006フロントエンド実装時 |

**バックエンド（EPIC-005）で遵守:**

- Hono APIはドメイン別Colocationパターンで実装
- Repository層でDB操作を抽象化（直接Supabase禁止）
- エラーレスポンスはRFC 7807 Problem Details形式
- ロギングはpino使用（console.log禁止）

**フロントエンド（EPIC-006）で遵守:**

- コロケーション原則: 関連するContext・Hook・コンポーネントは同一ディレクトリ
- ページ専用リソースは `_components/`, `_hooks/`, `_lib/`, `_types/` に配置
- 共通UIは `shared/components/ui/[ComponentName]/` に配置
- 型定義は使用箇所と同じディレクトリに配置

---

### ⚠️ 最重要ルール: デザイン準拠チェック（MUST）

**EPIC-006（フロントエンド）の実装時は、必ずモックアップとの整合性を確認すること。**

#### デザイン参照ドキュメント（実装前に必ず確認）

| ドキュメント           | パス                                          | 用途                 |
| ---------------------- | --------------------------------------------- | -------------------- |
| デザインガイドライン   | `mockups/DESIGN_GUIDELINES.md`                | 全体方針             |
| デザイントークン       | `mockups/design-tokens.css`                   | 色・spacing等        |
| 推薦画面モック         | `mockups/header-6-minimal-2btn.html`          | 推薦画面の最終版     |
| お気に入りモック       | `mockups/favorites-v2.html`                   | お気に入り画面       |
| オンボーディングモック | `mockups/onboarding-v2.html`                  | オンボーディング画面 |
| デザイン決定書         | `docs/decisions/frontend-design-decisions.md` | 設計判断の記録       |

#### 実装前チェックリスト（MUST）

UIコンポーネント実装前に、以下を必ず確認:

```bash
# 1. 対応するモックHTMLファイルを開いてビジュアルを確認
open mockups/{screen-name}.html

# 2. specファイルに「デザイン準拠チェックリスト」セクションがあるか確認
grep -n "デザイン準拠チェックリスト" specs/006-frontend/{story-id}/{subtask-id}.md
```

#### specファイルへの必須セクション

**EPIC-006のSubtask specには、以下のセクションを必須とする:**

```markdown
## デザイン準拠チェックリスト

**参照モック**: `mockups/{screen-name}.html`

- [ ] カラーがdesign-tokens.cssと一致している
- [ ] spacing（padding/margin）がモックと一致している
- [ ] アイコンがSVGで実装されている（テキスト絵文字禁止）
- [ ] border-radius/shadowがモックと一致している
- [ ] フォントサイズ・weightがモックと一致している
```

#### 違反時の対応

- デザイン準拠チェックリストなしでspec作成 → 即座にチェックリストを追加
- モック未確認で実装開始 → 即座に中断し、モックを確認
- テキスト絵文字でアイコン実装 → SVGアイコンに置き換え

---

### Skill自動発動ルール

実装・仕様策定・暗黙知抽出のキーワードが含まれる場合、対応するSkillをSkill toolで発動すること。直接実装を始めない。各Skillのdescriptionに発動条件の詳細が記載されている。

| Skill           | 代表的キーワード                         |
| --------------- | ---------------------------------------- |
| `spec-workflow` | 「実装して」「開発して」、Subtask ID言及 |
| `spec`          | 「specを作成して」「仕様を策定して」     |
| `clarify`       | 「clarifyして」「暗黙知を言語化して」    |

**違反時**: Skillを発動せずに実装を開始した場合は即座に中断しSkillを発動する。サブエージェント未使用でPRを作成した場合はPR前にcode-reviewer/quality-gateを実行する。

**サブエージェント（品質ゲートとしてスキップ不可）:**

| タイミング | サブエージェント  | 理由                                               |
| ---------- | ----------------- | -------------------------------------------------- |
| TDD開始前  | `test-strategist` | ACからテストケースを導出し、テスト設計の品質を担保 |
| PR作成前   | `code-reviewer`   | AC適合性・コード品質・セキュリティを検証           |
| PRマージ前 | `quality-gate`    | 全AC充足・テスト通過の最終確認                     |

---

### ステータス更新ルール

Subtask/Story/EPIC完了時は、以下のファイルでステータスを `completed` に更新する。更新漏れがあるとプロジェクトの進捗状況が不正確になり、次のタスク選定に支障が出る。

| 完了レベル  | 更新対象ファイル           |
| ----------- | -------------------------- |
| Subtask完了 | `subtask-list.md` の該当行 |
| Story完了   | `story-list.md` の該当行   |
| EPIC完了    | `epic-list.md` の該当行    |

---

### PR作成時のSpecチェックリスト確認

PR作成前に、対象Subtaskのspecファイルを確認し、完了済み項目にチェック `[x]` を入れる。これを怠るとquality-gateで不合格となり、PRがマージできない。

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

各Skillのdescriptionに発動キーワードが定義されている。上記「Skill自動発動ルール」セクションも参照。

追加のSkill（UI探索フェーズ用）:

- `bug-report`: 「バグを報告」「違和感がある」で発動
- `bug-fix`: 「バグを修正して」「Issueを対応して」で発動

### 避けるべきこと

- ACなしでの実装開始（仕様が不明確な状態で書いたコードは手戻りの原因になる）
- テストなしの実装（TDDを迂回するとACの充足を客観的に検証できない）
- スコープ外の「ついでに」実装（スコープ膨張は完了の遅延と品質低下を招く）
- ユーザー確認なしの仕様変更（specとの乖離が発生する）

---

### ⚠️ UI探索フェーズ: バグ対応Skill（アドホック）

**フェーズの位置づけ**: シナリオテスト（QA）前段階。UIの地雷除去が目的。

| Skill        | 目的             | 発動キーワード                             | スラッシュコマンド |
| ------------ | ---------------- | ------------------------------------------ | ------------------ |
| `bug-report` | 違和感→Issue作成 | 「バグを報告」「違和感がある」「おかしい」 | `/bug-report`      |
| `bug-fix`    | Issue一覧→修正PR | 「バグを修正して」「Issueを対応して」      | `/bug-fix`         |

**バグ認定の比較対象（UI）:**

```
モックアップHTML → デザイントークン → spec AC → 人間の違和感
```

**ラベル体系:**

| 軸     | 値                                                                              |
| ------ | ------------------------------------------------------------------------------- |
| 重要度 | `critical` / `major` / `minor`                                                  |
| 画面   | `screen:onboarding` / `screen:recommend` / `screen:favorites` / `screen:common` |
| 状態   | `status:open` / `status:in-progress` / `status:fixed` / `status:wontfix`        |
| 種別   | `type:ui-bug`                                                                   |

**運用ルール:**

- 同一原因のIssueはAI判断でグルーピングして修正
- 対応しない場合は `wontfix` でクローズ（理由コメント必須）
- ついで修正は禁止
- 修正対象は main ブランチのみ（QAブランチは触らない）

**クラウド環境対応:**

- gh CLI利用可能 → 自動でIssue作成/更新
- gh CLI利用不可 → テンプレート出力（GitHub Web UIでコピペ作成）

詳細: `.claude/skills/bug-report/SKILL.md`, `.claude/skills/bug-fix/SKILL.md`

---

## サブエージェント活用ガイド

> 詳細は `.claude/AGENTS.md` を参照。

## コーディングルール & コミット規約

> 詳細は `.claude/CODING_RULES.md` を参照。

**コミット前に必ず `pnpm format` を実行すること。** lefthookはClaude Code環境で動作しないため手動実行が必須。

---

## プロジェクト進捗

**完了済み（17/20 EPIC）**: PoC, 品質基盤, データパイプライン, 推薦ロジック, バックエンドAPI, フロントエンドUI, インフラ, 監視, セキュリティ, 日本語対応, QAテスト, 嗜好リセット, SCPライセンス, PWA, 記事速度改善, アプリアセット, レスポンシブ

**未完了（3 EPIC）**:

- **EPIC-012**: スロークエリ最適化（012-02: 初期スロークエリ修正が pending）
- **EPIC-018**: リリース前最終確認（018-03: 本番パフォーマンスが pending）
- **EPIC-020**: 本番リリース準備（Vercel Analytics導入・告知・アクセス確認）

---

## CLAUDE.md分割方針

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

- プロジェクト概要・ドキュメント構成・Claudeへの指示

### 学習記録

> `.claude/NOTES.md` に分離済み。改善案・技術メモ・教訓はそちらを参照。
