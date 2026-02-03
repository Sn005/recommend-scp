---
name: bug-report
description: UI探索フェーズで発見した違和感をGitHub Issueとして記録。比較対象（モック/トークン/AC）と照合し、バグ認定・ラベル付与を自動化。クラウド環境ではテンプレート出力にフォールバック。Use when "バグを報告", "違和感がある", "おかしい", "バグっぽい" keywords appear.
---

# /bug-report Skill - UI探索バグ報告ワークフロー

UI探索フェーズで発見した違和感を、GitHub Issueとして記録するSkill。
比較対象と照合してバグ認定し、適切なラベルを付与します。

## 発動条件

以下のキーワードで自動発動：

- 「バグを報告」「バグ報告」
- 「違和感がある」「違和感を感じる」
- 「おかしい」「バグっぽい」
- 「UI問題」「表示がおかしい」

またはスラッシュコマンド：

- `/bug-report`

## 基本原則

1. **比較対象ベース**: 主観ではなく、モック/トークン/ACとの差分で判断
2. **ラベル自動付与**: 重要度・画面・状態・種別を自動決定
3. **クラウド環境対応**: gh CLI不可時はテンプレート出力にフォールバック
4. **追跡可能性**: Issue URLを必ず記録

---

## ワークフロー

### 全体フロー

```
┌─────────────────────────────────────────────────────────────┐
│  /bug-report 開始                                           │
│      │                                                      │
│      ├─ Step 1: 違和感の解析                                │
│      │   - 画面・コンポーネント特定                         │
│      │   - 問題種別判定                                     │
│      │                                                      │
│      ├─ Step 2: 比較対象との照合（UI対象の場合）            │
│      │   1. モックアップHTML                                │
│      │   2. デザイントークン                                │
│      │   3. specファイルのAC                                │
│      │   4. 人間の違和感記述                                │
│      │                                                      │
│      ├─ Step 3: バグ認定判断                                │
│      │   - 差分あり → バグ認定                              │
│      │   - 差分なし → 人間に確認                            │
│      │                                                      │
│      ├─ Step 4: ラベル決定                                  │
│      │   - 重要度: critical / major / minor                 │
│      │   - 画面: screen:{画面名}                            │
│      │   - 状態: status:open                                │
│      │   - 種別: type:ui-bug                                │
│      │                                                      │
│      └─ Step 5: GitHub Issue作成                            │
│          ├─ gh CLI利用可能 → 自動作成                       │
│          └─ gh CLI利用不可 → テンプレート出力               │
└─────────────────────────────────────────────────────────────┘
```

---

## 比較対象の優先順位

### UI対象の場合

```
1. モックアップHTML（mockups/*.html）
   └─ ビジュアルの差分を確認

2. デザイントークン（mockups/design-tokens.css）
   └─ 色・spacing・font等の値を確認

3. specファイルのAC
   └─ 仕様との差分を確認

4. 人間の違和感記述
   └─ 上記で検出できない場合、記述をそのまま採用
```

### サーバー対象の場合

```
1. specファイルのAC
   └─ 仕様との差分を確認

2. 人間の違和感記述
   └─ ACで検出できない場合、記述をそのまま採用
```

---

## 重要度判定基準

| 重要度     | 条件                                | 例                         |
| ---------- | ----------------------------------- | -------------------------- |
| `critical` | 誤操作を誘発する / データ損失リスク | 削除ボタンが保存に見える   |
| `major`    | 状態が分からなくなる / 操作に支障   | ローディング中か完了か不明 |
| `minor`    | 視認性低下 / 美観・細かなズレ       | 色が薄い、余白がずれている |

---

## ラベル体系

| 軸     | ラベル               | 説明                         |
| ------ | -------------------- | ---------------------------- |
| 重要度 | `critical`           | 誤操作誘発、データ損失リスク |
|        | `major`              | 状態不明、操作に支障         |
|        | `minor`              | 視認性低下、美観             |
| 画面   | `screen:onboarding`  | オンボーディング画面         |
|        | `screen:recommend`   | 推薦画面                     |
|        | `screen:favorites`   | お気に入り画面               |
|        | `screen:common`      | 共通コンポーネント           |
| 状態   | `status:open`        | 未対応                       |
|        | `status:in-progress` | 対応中                       |
|        | `status:fixed`       | 修正済み                     |
|        | `status:wontfix`     | 意図的に対応しない           |
| 種別   | `type:ui-bug`        | UI探索で発見                 |

---

## Issue本文テンプレート

```markdown
## 概要

[1行で問題を説明]

## 発見経緯

- 報告者の記述: [人間が投げた自然言語]
- 検出根拠: [モックアップ差分 / デザイントークン違反 / AC違反]

## 再現手順

1. [画面]を開く
2. [操作]を行う
3. [期待結果] vs [実際の結果]

## 比較対象

- 参照モック: `mockups/xxx.html`
- 該当コード: `apps/web/src/xxx.tsx:123`

## 影響範囲

- 画面: [画面名]
- コンポーネント: [コンポーネント名]

## 提案される修正方針

[AIの初期判断]
```

---

## API連携（推奨）

### GITHUB_TOKEN利用可能な場合（自動）

`scripts/github-issue.sh` を使用してAPI経由で自動作成：

```bash
# 認証確認
./scripts/github-issue.sh check

# Issue作成
./scripts/github-issue.sh create \
  --title "[screen:recommend] ボタンの色が薄い" \
  --body "## 概要
ボタンの色がデザイントークンと異なり、視認性が低下している

## 発見経緯
- 報告者の記述: ボタンの色が薄くて見づらい
- 検出根拠: design-tokens.css との差分

## 比較対象
- 参照モック: mockups/header-6-minimal-2btn.html
- 該当コード: apps/web/src/components/Button.tsx:45

## 提案される修正方針
opacity: 0.7 を削除し、design-tokensの色をそのまま使用" \
  --labels "type:ui-bug,major,screen:recommend,status:open"
```

### gh CLI利用可能な場合

```bash
# 認証確認
gh auth status

# Issue作成
gh issue create \
  --title "[screen:recommend] ボタンの色が薄い" \
  --body "$(cat <<'EOF'
## 概要
...
EOF
)" \
  --label "type:ui-bug,major,screen:recommend,status:open"
```

### フォールバック（GITHUB_TOKEN/gh CLI どちらも不可）

テンプレートを出力し、ユーザーがGitHub Web UIで作成：

```markdown
---

## GitHub Issue作成テンプレート

以下の内容でIssueを作成してください。

**リポジトリ**: https://github.com/{owner}/{repo}/issues/new

**タイトル**:
```

[screen:recommend] ボタンの色が薄くて見づらい

```

**ラベル**: `type:ui-bug`, `major`, `screen:recommend`, `status:open`

**本文**:
（Issue本文テンプレートの内容）

---
Issue作成後、URLを入力してください:
```

ユーザーがURLを入力したら、そのURLを記録して処理を完了。

---

## 対話制御コマンド

| コマンド           | 動作                         |
| ------------------ | ---------------------------- |
| 「Issue化する」    | 差分なしでもIssue作成を実行  |
| 「Issue化しない」  | Issue作成をスキップ          |
| 「ラベルを変更」   | 自動決定されたラベルを修正   |
| 「詳しく調査して」 | 比較対象との照合を詳細に実行 |

---

## 使用例

### 例1: 基本的なバグ報告

```
ユーザー: 「推薦画面のボタンの色が薄くて見づらい」

[自動] /bug-report Skill発動

Claude: /bug-report を開始します。

## Step 1: 違和感の解析
- 画面: 推薦画面（screen:recommend）
- 問題種別: 視認性低下

## Step 2: 比較対象との照合
mockups/header-6-minimal-2btn.html を確認中...

検出結果:
- design-tokens.css: --color-primary: #6366f1
- 実装コード: Button.tsx で opacity: 0.7 が適用されている
- **差分あり**: デザイントークンと異なる

## Step 3: バグ認定
✅ バグと認定しました

## Step 4: ラベル決定
- 重要度: minor（視認性低下）
- 画面: screen:recommend
- 状態: status:open
- 種別: type:ui-bug

## Step 5: Issue作成
gh CLI を確認中...
✅ 認証OK

Issue #42 を作成しました: https://github.com/xxx/recommend-scp/issues/42
```

### 例2: クラウド環境（gh CLI不可）

```
ユーザー: 「お気に入り画面のアイコンがずれてる」

[自動] /bug-report Skill発動

Claude: /bug-report を開始します。

（Step 1-4 省略）

## Step 5: Issue作成
gh CLI を確認中...
❌ gh: command not found

テンプレートを出力します。GitHub Web UIで作成してください。

---
## GitHub Issue作成テンプレート

**リポジトリ**: https://github.com/xxx/recommend-scp/issues/new

**タイトル**:
```

[screen:favorites] アイコンの位置がずれている

```

**ラベル**: `type:ui-bug`, `minor`, `screen:favorites`, `status:open`

**本文**:
## 概要
お気に入り画面のアイコンの位置が、モックアップと比較してずれている
...

---
Issue作成後、URLを入力してください:

ユーザー: https://github.com/xxx/recommend-scp/issues/43

Claude: Issue URL を記録しました: #43
```

---

## 禁止事項

- ❌ 比較対象を確認せずにバグ認定する
- ❌ ラベルなしでIssueを作成する
- ❌ 重要度を過大/過小評価する
- ❌ UIとサーバーの比較対象優先順位を混同する

---

## 連携フロー

```
/bug-report（本Skill）
    │
    └─ Issue作成
           ↓
       Issue蓄積
           ↓
/bug-fix（修正Skill）
    └─ Issue一覧から修正実行
```

---

## 関連Skill

- **/bug-fix**: Issue一覧から修正を実行（本Skillの下流）
- **/clarify**: 暗黙知抽出（バグの根本原因分析に使用可能）

---

## 参照ドキュメント

- [デザインガイドライン](../../../mockups/DESIGN_GUIDELINES.md)
- [デザイントークン](../../../mockups/design-tokens.css)
- [UI探索ワークフロー](../../../docs/ui-exploration-workflow.md)
