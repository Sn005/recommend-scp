# 仕様駆動開発（SDD）フォーマット定義

## 概要

このドキュメントは、AI駆動開発における仕様書のフォーマットを定義します。
**EPIC → Story → Subtask** の3階層構造で、各レベルにAcceptance Criteria（AC）とユーザーストーリーを必須とします。

## 構造定義

```
specs/
├── epic-list.md                          # 全EPIC一覧
└── {epic-id}/
    ├── {epic-id}.md                      # EPIC定義
    ├── story-list.md                     # このEPIC内のStory一覧
    └── {story-id}/
        ├── {story-id}.md                 # Story定義
        ├── subtask-list.md               # このStory内のSubtask一覧
        └── {subtask-id}.md               # Subtask定義
```

## 階層関係

```
📋 EPIC
  👤 ユーザーストーリー
  ✅ AC (Acceptance Criteria)
  └── 🎯 Story
        👤 ユーザーストーリー
        ✅ AC (Acceptance Criteria)
      └── ⚡ Subtask
            👤 ユーザーストーリー
            ✅ AC (Acceptance Criteria)
```

---

## EPICファイル形式

**ファイル名**: `specs/{epic-id}/{epic-id}.md`

**例**: `specs/001-environment-setup/001-environment-setup.md`

```markdown
---
id: "001"
title: "環境構築"
status: "pending" # pending | in_progress | completed
created_at: "2024-01-01"
updated_at: "2024-01-01"
---

# EPIC: 環境構築

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: 効率的な開発環境を構築する
**価値**: 品質の高いアプリケーションを迅速に開発できる
**理由**: 統一された環境で開発効率を最大化したい

> 開発者として、効率的な開発環境を構築して、品質の高いアプリケーションを迅速に開発したい。なぜなら統一された環境で開発効率を最大化したいから。

## Acceptance Criteria

- [ ] モノレポ構成が完全に動作すること
- [ ] 各アプリで統一された開発環境が利用できること
- [ ] ベースアプリケーションが開発・動作確認できること

## 関連Story

- [001-01: 共通設定整備](./001-01-common-config/001-01-common-config.md)
- [001-02: 基本アプリケーション作成](./001-02-base-app/001-02-base-app.md)

## 備考

（技術的制約、参照ドキュメント等）
```

---

## Storyファイル形式

**ファイル名**: `specs/{epic-id}/{story-id}/{story-id}.md`

**例**: `specs/001-environment-setup/001-01-common-config/001-01-common-config.md`

```markdown
---
id: "001-01"
epic_id: "001"
epic_title: "環境構築"
title: "共通設定整備"
status: "pending" # pending | in_progress | completed
created_at: "2024-01-01"
updated_at: "2024-01-01"
---

# Story: 共通設定整備

## 親EPIC

[001: 環境構築](../001-environment-setup.md)

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: 全アプリで一貫したコード品質を保つ
**価値**: メンテナンス性の高いコードベースを構築する
**理由**: 品質管理を自動化したい

> 開発者として、全アプリで一貫したコード品質を保って、メンテナンス性の高いコードベースを構築したい。なぜなら品質管理を自動化したいから。

## Acceptance Criteria

- [ ] 共通eslint-configが存在すること
- [ ] 各アプリで `pnpm lint` が正常に動作すること
- [ ] モノレポ全体で一貫したコードフォーマットが保たれること

## 関連Subtask

- [001-01-01: 設定要件の確認と決定](./001-01-01-config-requirements.md)
- [001-01-02: ESLint設定作成](./001-01-02-eslint-setup.md)
- [001-01-03: Prettier設定作成](./001-01-03-prettier-setup.md)

## 備考

（技術的制約、参照ドキュメント等）
```

---

## Subtaskファイル形式

**ファイル名**: `specs/{epic-id}/{story-id}/{subtask-id}.md`

**例**: `specs/001-environment-setup/001-01-common-config/001-01-01-config-requirements.md`

```markdown
---
id: "001-01-01"
epic_id: "001"
story_id: "001-01"
epic_title: "環境構築"
story_title: "共通設定整備"
title: "設定要件の確認と決定"
status: "pending" # pending | in_progress | completed
created_at: "2024-01-01"
updated_at: "2024-01-01"
completed_at: null # 完了時に日付を記入
---

# Subtask: 設定要件の確認と決定

## 親Story

[001-01: 共通設定整備](./001-01-common-config.md)

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: 設定ファイルの方針を明確にする
**価値**: 迷いなく開発を進められる
**理由**: 設定の不統一による混乱を避けたい

> 開発者として、設定ファイルの方針を明確にして、迷いなく開発を進められるようにしたい。なぜなら設定の不統一による混乱を避けたいから。

## Acceptance Criteria

- [ ] 設定ファイル配置方針が明確に決定されていること
- [ ] ESLint、Prettier、TypeScriptの設定内容が仕様として確定していること
- [ ] package.jsonスクリプトの統一方針が決定されていること

## 設計（オプション）

複雑なSubtaskの場合、実装前に技術設計を明記します。

### データフロー

```mermaid
graph LR
    A[入力] --> B[処理]
    B --> C[出力]
```

### インターフェース定義

```typescript
interface ConfigRequirements {
  eslint: ESLintConfig;
  prettier: PrettierConfig;
  typescript: TypeScriptConfig;
}

interface ESLintConfig {
  configPath: string;
  rules: Record<string, unknown>;
}
```

### 技術的考慮事項

- 依存関係
- パフォーマンス要件
- セキュリティ考慮

---

## 実装メモ

（実装時に記録する内容）

- 調査結果
- 決定事項
- 技術的な注意点

## テストケース（ACから導出）

```typescript
describe('設定要件の確認と決定', () => {
  it('設定ファイル配置方針が明確に決定されている', () => {
    // 検証内容
  })

  it('ESLint、Prettier、TypeScriptの設定内容が仕様として確定している', () => {
    // 検証内容
  })

  it('package.jsonスクリプトの統一方針が決定されている', () => {
    // 検証内容
  })
})
```

## 完了確認

- 確認日: （完了時に記入）
- 確認者: （完了時に記入）
- 備考: （完了時に記入）

## 参照ドキュメント

- [ワークフロー定義](../../../.ai/WORKFLOW.md)
```

---

## 一覧ファイル形式

### epic-list.md

**ファイル名**: `specs/epic-list.md`

```markdown
# EPIC一覧

このプロジェクトで管理しているEPICの一覧です。

| ID | 名前 | 概要 | ステータス |
|----|------|------|-----------|
| [001](./001-environment-setup/001-environment-setup.md) | 環境構築 | 効率的な開発環境を構築する | pending |
| [002](./002-user-auth/002-user-auth.md) | ユーザー認証 | ログイン機能を実装する | pending |
```

### story-list.md

**ファイル名**: `specs/{epic-id}/story-list.md`

```markdown
# Story一覧 - EPIC: 環境構築

このEPIC配下のStory一覧です。

| ID | 名前 | 概要 | ステータス |
|----|------|------|-----------|
| [001-01](./001-01-common-config/001-01-common-config.md) | 共通設定整備 | コード品質を自動化する | pending |
| [001-02](./001-02-base-app/001-02-base-app.md) | 基本アプリケーション作成 | 開発基盤を構築する | pending |
```

### subtask-list.md

**ファイル名**: `specs/{epic-id}/{story-id}/subtask-list.md`

```markdown
# Subtask一覧 - Story: 共通設定整備

このStory配下のSubtask一覧です。

| ID | 名前 | 概要 | ステータス |
|----|------|------|-----------|
| [001-01-01](./001-01-01-config-requirements.md) | 設定要件の確認と決定 | 設定方針を明確にする | pending |
| [001-01-02](./001-01-02-eslint-setup.md) | ESLint設定作成 | ESLintを導入する | pending |
```

---

## ID採番ルール

| レベル | フォーマット | 例 |
|--------|-------------|-----|
| EPIC | `{3桁連番}` | `001`, `002` |
| Story | `{EPIC-ID}-{2桁連番}` | `001-01`, `001-02` |
| Subtask | `{Story-ID}-{2桁連番}` | `001-01-01`, `001-01-02` |

## ステータス定義

| ステータス | 意味 |
|-----------|------|
| `pending` | 未着手 |
| `in_progress` | 作業中 |
| `completed` | 完了 |

## Acceptance Criteria（AC）のガイドライン

### 良いACの特徴

- **測定可能**: 客観的に達成を判断できる
- **具体的**: 曖昧さがない
- **独立**: 他のACに依存しない
- **テスト可能**: テストケースに変換可能

### EARS記法（推奨）

EARS（Easy Approach to Requirements Syntax）記法は、曖昧さを排除し、テストケースへの直接変換を容易にする構造化された要件記述方式です。

#### 基本パターン

```markdown
WHEN [トリガー・状況]
GIVEN [前提条件]
THEN [期待動作]
AND [追加動作]
```

#### パターン別テンプレート

**イベント駆動型（Event-Driven）**
```markdown
WHEN ユーザーがログインボタンをクリックした際
GIVEN 正しいメールアドレスとパスワードを入力した場合
THEN システムは認証を確認する
AND 成功時はダッシュボードにリダイレクトする
```

**状態依存型（State-Driven）**
```markdown
WHILE システムがメンテナンスモードの間
THE SYSTEM SHALL 読み取り専用アクセスのみ許可する
AND 書き込み操作は全て拒否する
```

**条件付き型（Condition-Driven）**
```markdown
WHERE 管理者権限が必要な機能に
IF アクセスが試行された場合
THE SYSTEM SHALL 権限レベルを確認する
AND 不十分な場合はアクセス拒否する
```

**無条件型（Unconditional）**
```markdown
THE SYSTEM SHALL 全てのAPIリクエストをログに記録する
```

#### EARS記法の適用例

**従来のAC:**
```markdown
- [ ] ユーザーがログインできること
```

**EARS記法適用後:**
```markdown
- [ ] WHEN ユーザーがログインを試行する際
      GIVEN 有効なメールアドレスとパスワードを入力した場合
      THEN システムはJWTトークンを発行する
      AND ダッシュボードにリダイレクトする
```

#### 使い分けの指針

| 状況 | 推奨形式 |
|------|----------|
| 複雑な条件分岐がある | EARS記法 |
| エッジケースが多い | EARS記法 |
| 単純な存在確認 | 従来形式でOK |
| 設定ファイルの有無 | 従来形式でOK |

### 従来形式の例

**良い例:**
- `ESLint設定ファイルがルートに存在すること`
- `pnpm lint コマンドで全ファイルがチェックされること`
- `型エラーがゼロであること`

**悪い例:**
- `設定が適切であること` → 「適切」の基準が不明
- `コードがきれいであること` → 「きれい」の定義が曖昧
- `問題がないこと` → 何が問題かが不明確

## ユーザーストーリーの書き方

### フォーマット

> **[ペルソナ]** として、**[目的・行動]** して、**[価値・結果]** したい。なぜなら **[理由・動機]** だから。

### 例

> 開発者として、型安全なAPIクライアントを使用して、コンパイル時にエラーを検出したい。なぜなら実行時エラーを減らし、開発効率を向上させたいから。

## 完了マークのルール

- 完了したSubtask/Story/EPICは `status: "completed"` に変更
- `completed_at` に完了日時を記入
- AC のチェックボックスを `[x]` に更新
