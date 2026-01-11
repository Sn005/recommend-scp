# Subtask 002-02-01: lefthook + commitlint設定

## 概要

lefthook（npm版）とcommitlintを導入し、コミット時の自動lint/formatとConventional Commits形式の強制を実現する。

## ユーザーストーリー

**As a** 開発者（AI/人間）
**I want** コミット時に自動的にlint/formatが実行され、コミットメッセージが検証される
**So that** 品質の低いコードがリポジトリに入ることを防げる

## Acceptance Criteria（EARS記法）

### AC-1: pre-commitフック

- [x] WHEN `git commit` を実行した際
      GIVEN ステージングされたファイルがある場合
      THEN lefthookがpre-commitフックを実行する
      AND ステージングされたファイルのみを対象にlint/formatを実行する

### AC-2: 自動修正とre-staging

- [x] WHEN pre-commitフックでlint/formatが実行された際
      GIVEN 自動修正が行われた場合
      THEN 修正後のファイルが自動的に再ステージングされる

### AC-3: commit-msgフック

- [x] WHEN `git commit` でコミットメッセージを入力した際
      GIVEN Conventional Commits形式でない場合
      THEN コミットをブロックする
      AND 正しい形式の例を表示する

### AC-4: フックスキップ

- [x] WHEN `git commit --no-verify` を実行した際
      THE SYSTEM SHALL フックをスキップする
      AND 緊急時の回避手段を提供する

### AC-5: CLAUDE.md更新

- [x] WHERE CLAUDE.mdにおいて
      THE SYSTEM SHALL Conventional Commits形式のルールを記載する
      AND AIがコミットメッセージ生成時に参照できるようにする

## 技術設計

### インストールパッケージ

```bash
pnpm add -D -w lefthook @commitlint/cli @commitlint/config-conventional
```

### lefthook設定（lefthook.yml）

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{ts,tsx,js,jsx,mjs}"
      run: pnpm eslint --fix {staged_files}
      stage_fixed: true
    format:
      glob: "*.{ts,tsx,js,jsx,mjs,json,md,yml,yaml}"
      run: pnpm prettier --write {staged_files}
      stage_fixed: true

commit-msg:
  commands:
    commitlint:
      run: pnpm commitlint --edit {1}
```

### commitlint設定（commitlint.config.mjs）

```javascript
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // 新機能
        "fix", // バグ修正
        "docs", // ドキュメント
        "style", // フォーマット
        "refactor", // リファクタリング
        "perf", // パフォーマンス
        "test", // テスト
        "chore", // その他
      ],
    ],
  },
};
```

### lefthookインストールコマンド

```bash
pnpm lefthook install
```

### CLAUDE.md追記内容

```markdown
## コミットメッセージ規約（Conventional Commits）

コミットメッセージは以下の形式に従うこと：
```

<type>(<scope>): <description>

[optional body]

[optional footer(s)]

```

### type（必須）
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマット等）
- `refactor`: バグ修正でも機能追加でもないコード変更
- `perf`: パフォーマンス改善
- `test`: テストの追加・修正
- `chore`: ビルドプロセスやツールの変更

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

```

## テストケース

- [x] `git commit` でlefthookが実行される
- [x] ステージングされたファイルのみがlint/formatされる
- [x] 自動修正されたファイルが再ステージングされる
- [x] `feat: xxx` 形式のコミットメッセージが通る
- [x] `invalid message` 形式のコミットメッセージがブロックされる
- [x] `git commit --no-verify` でフックがスキップされる

## ステータス

- **status**: completed
