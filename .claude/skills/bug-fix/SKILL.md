---
name: bug-fix
description: GitHub IssueのUI探索バグを網羅的に修正。関連Issueをグルーピングしてバッチ処理し、PRを作成。クラウド環境ではテンプレート出力にフォールバック。Use when "バグを修正して", "Issueを対応して", "UI修正して" keywords appear.
---

# /bug-fix Skill - UI探索バグ修正ワークフロー

GitHub IssueのUI探索バグを網羅的に修正するSkill。
関連Issueをグルーピングしてバッチ処理し、PRを作成します。

## 発動条件

以下のキーワードで自動発動：

- 「バグを修正して」「バグ修正」
- 「Issueを対応して」「Issue対応」
- 「UI修正して」「UI修正」
- 「まとめて直して」

またはスラッシュコマンド：

- `/bug-fix`

## 基本原則

1. **グルーピング優先**: 同一原因のIssueはまとめて修正
2. **承認ベース**: 修正計画を提示し、承認後に実行
3. **追跡可能性**: PRに全対象Issueを紐付け
4. **ついで修正禁止**: 無関係なUI改善は行わない

---

## ワークフロー

### 全体フロー

```
┌─────────────────────────────────────────────────────────────┐
│  /bug-fix 開始                                              │
│      │                                                      │
│      ├─ Step 1: Issue一覧取得                               │
│      │   - ラベルフィルタでIssue取得                        │
│      │   - 本文・ラベルを解析                               │
│      │                                                      │
│      ├─ Step 2: グルーピング                                │
│      │   - 同一原因でグループ化                             │
│      │   - 同一コンポーネントでグループ化                   │
│      │   - 同一画面でグループ化                             │
│      │                                                      │
│      ├─ Step 3: 修正計画の提示                              │
│      │   - グループごとの修正方針を説明                     │
│      │   - 人間の承認を待つ                                 │
│      │                                                      │
│      ├─ Step 4: バッチ修正実行                              │
│      │   - グループごとにコード修正                         │
│      │   - Issueラベルを status:fixed に更新                │
│      │                                                      │
│      └─ Step 5: PR作成                                      │
│          - 複数Issueを Fixes で紐付け                       │
│          - 修正内容一覧を記載                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 入力形式

### Issue一覧URL（推奨）

```
https://github.com/{owner}/{repo}/issues?q=label:type:ui-bug+label:status:open
```

### ラベル指定

```
ユーザー: 「type:ui-bug と status:open のIssueを修正して」
```

### Issue番号直接指定

```
ユーザー: 「#1, #2, #3 を修正して」
```

---

## グルーピング判断基準

AIは以下の基準でIssueをグループ化します：

| 基準               | 例                   | グループ化理由          |
| ------------------ | -------------------- | ----------------------- |
| 同一原因           | design-tokens未適用  | 同じ修正で複数Issue解決 |
| 同一コンポーネント | Buttonへの複数指摘   | 1ファイルで完結         |
| 同一画面           | 推薦画面内の複数問題 | 影響範囲が限定的        |

### グルーピング例

```
入力Issue:
- #1: ボタンの色が薄い
- #2: テキストの色が薄い
- #3: ボタンの角丸が違う
- #4: アイコンがずれている

グルーピング結果:
├─ Group A: design-tokens未適用（#1, #2）
│   └─ 修正: color変数の適用
├─ Group B: border-radius不一致（#3）
│   └─ 修正: border-radius変数の適用
└─ Group C: アイコン配置（#4）
    └─ 修正: flexbox調整
```

---

## 修正計画テンプレート

```markdown
## 修正計画

### Group A: design-tokens未適用

**対象Issue**: #1, #2
**原因**: color変数がハードコーディングされている
**修正箇所**:

- `apps/web/src/components/Button.tsx`
- `apps/web/src/components/Text.tsx`
  **修正内容**: `color: #xxx` → `color: var(--color-primary)`

### Group B: border-radius不一致

**対象Issue**: #3
**原因**: border-radiusが固定値
**修正箇所**:

- `apps/web/src/components/Button.tsx`
  **修正内容**: `border-radius: 4px` → `border-radius: var(--radius-md)`

---

この計画で修正を開始してよいですか？
```

---

## wontfix判断フロー

対応しないと判断した場合：

```
┌─────────────────────────────────────────────────────────────┐
│  wontfix判断                                                │
│      │                                                      │
│      ├─ 1. 理由を明確化                                     │
│      │   - 仕様通りの動作                                   │
│      │   - 修正コスト > 効果                                │
│      │   - QAフェーズで再評価予定                           │
│      │                                                      │
│      ├─ 2. Issueにコメント                                  │
│      │   「理由: xxx のため、wontfixとします」              │
│      │                                                      │
│      ├─ 3. ラベル更新                                       │
│      │   status:open → status:wontfix                       │
│      │                                                      │
│      └─ 4. Issueクローズ                                    │
└─────────────────────────────────────────────────────────────┘
```

### wontfix理由テンプレート

```markdown
## wontfix理由

このIssueは以下の理由により、対応しないこととしました。

**理由**: [仕様通りの動作 / 修正コスト > 効果 / QAフェーズで再評価予定]

**詳細**:
[具体的な説明]

**再評価条件**:
[どのような状況で再検討するか]
```

---

## PR本文テンプレート

```markdown
## Summary

UI探索フェーズで発見された以下のIssueを修正

## Fixes

- Closes #1 - ボタンの色が薄い
- Closes #2 - テキストの色が薄い
- Closes #3 - ボタンの角丸が違う

## 修正内容

| Issue  | 原因                | 修正箇所                 |
| ------ | ------------------- | ------------------------ |
| #1, #2 | design-tokens未適用 | `Button.tsx`, `Text.tsx` |
| #3     | border-radius不一致 | `Button.tsx`             |

## 検証方法

- [ ] モックアップと目視比較
- [ ] 該当画面の動作確認

## wontfixとしたIssue

| Issue | 理由           |
| ----- | -------------- |
| #5    | 仕様通りの動作 |

https://claude.ai/code/session_xxx
```

---

## API連携（推奨）

### GITHUB_TOKEN利用可能な場合（自動）

`scripts/github-issue.sh` を使用してAPI経由で自動操作：

```bash
# 認証確認
./scripts/github-issue.sh check

# Issue一覧取得（ラベルでフィルタ）
./scripts/github-issue.sh list --labels "type:ui-bug,status:open"

# Issue詳細取得
./scripts/github-issue.sh get --number 42

# ラベル更新（status:open → status:fixed）
./scripts/github-issue.sh update --number 42 \
  --remove-labels "status:open" \
  --add-labels "status:fixed"

# wontfixクローズ
./scripts/github-issue.sh update --number 42 --add-labels "status:wontfix"
./scripts/github-issue.sh close --number 42 --reason "仕様通りの動作のため"
```

### gh CLI利用可能な場合

```bash
# Issue一覧取得
gh issue list --label "type:ui-bug,status:open" --json number,title,labels,body

# ラベル更新
gh issue edit {number} --remove-label "status:open" --add-label "status:fixed"

# PR作成
gh pr create --title "fix(ui): UI探索バグ修正" --body "..."

# wontfixクローズ
gh issue close {number} --comment "理由: ..."
gh issue edit {number} --add-label "status:wontfix"
```

### フォールバック（GITHUB_TOKEN/gh CLI どちらも不可）

```markdown
---
## 手動操作ガイド

### 1. Issue一覧確認
以下のURLでIssueを確認してください:
https://github.com/{owner}/{repo}/issues?q=label:type:ui-bug+label:status:open

### 2. 修正完了後のラベル更新
各Issueで以下を実行:
- `status:open` ラベルを削除
- `status:fixed` ラベルを追加

### 3. PR作成
以下の内容でPRを作成してください:

**タイトル**: fix(ui): UI探索バグ修正

**本文**:
（PR本文テンプレートの内容）

---

PR作成後、URLを入力してください:
```

---

## 対話制御コマンド

| コマンド               | 動作                              |
| ---------------------- | --------------------------------- |
| 「承認」「OK」         | 修正計画を承認し、実行開始        |
| 「計画を修正」         | グルーピングや修正方針を変更      |
| 「このIssueはwontfix」 | 指定Issueをwontfixとして処理      |
| 「このIssueを除外」    | 指定Issueを今回の修正対象から除外 |
| 「詳しく説明して」     | 修正方針の詳細を説明              |

---

## 使用例

### 例1: 基本的なバグ修正フロー

```
ユーザー: 「type:ui-bug のIssueを修正して」

[自動] /bug-fix Skill発動

Claude: /bug-fix を開始します。

## Step 1: Issue一覧取得
gh CLI を確認中... ✅ 認証OK

取得したIssue:
- #1: [screen:recommend] ボタンの色が薄い
- #2: [screen:recommend] テキストの色が薄い
- #3: [screen:favorites] アイコンがずれている

## Step 2: グルーピング

### Group A: design-tokens未適用（#1, #2）
- 原因: color変数がハードコーディング
- 修正箇所: Button.tsx, Text.tsx

### Group B: アイコン配置（#3）
- 原因: flexbox設定不足
- 修正箇所: FavoriteIcon.tsx

## Step 3: 修正計画

この計画で修正を開始してよいですか？

ユーザー: OK

Claude: ## Step 4: バッチ修正実行

### Group A 修正中...
- Button.tsx: color変数を適用 ✅
- Text.tsx: color変数を適用 ✅
- #1, #2 のラベルを status:fixed に更新 ✅

### Group B 修正中...
- FavoriteIcon.tsx: flexbox調整 ✅
- #3 のラベルを status:fixed に更新 ✅

## Step 5: PR作成

PR #10 を作成しました: https://github.com/xxx/recommend-scp/pull/10

Fixes: #1, #2, #3
```

### 例2: wontfix判断

```
ユーザー: 「#5 は仕様通りだからwontfixにして」

Claude: #5 をwontfixとして処理します。

Issueにコメントを追加:
「理由: 仕様通りの動作のため、wontfixとします」

ラベルを更新: status:open → status:wontfix
Issueをクローズしました。

#5: https://github.com/xxx/recommend-scp/issues/5
```

---

## 禁止事項

- ❌ 無関係なUI改善（ついで修正）
- ❌ 承認なしでの修正開始
- ❌ QAブランチへの修正（mainブランチのみ）
- ❌ グルーピングなしの1件ずつ対応
- ❌ wontfix理由なしでのクローズ

---

## 連携フロー

```
/bug-report（報告Skill）
    │
    └─ Issue作成・蓄積
           ↓
/bug-fix（本Skill）
    ├─ Issue取得
    ├─ グルーピング
    ├─ バッチ修正
    └─ PR作成
           ↓
       mainブランチにマージ
           ↓
       QAフェーズへ
```

---

## 関連Skill

- **/bug-report**: Issue作成（本Skillの上流）
- **/pr**: PR作成（修正完了時に連携）
- **/branch**: ブランチ作成（修正用ブランチ作成時に連携）

---

## 参照ドキュメント

- [デザインガイドライン](../../../mockups/DESIGN_GUIDELINES.md)
- [デザイントークン](../../../mockups/design-tokens.css)
- [UI探索ワークフロー](../../../docs/ui-exploration-workflow.md)
