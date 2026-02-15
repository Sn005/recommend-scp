# Subtask 011-01-02: data-testid ESLintルール

## 概要

data-testid属性の命名規則をESLintで検証し、一貫したセレクタ命名を強制する。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: data-testid属性の命名規則をLintで検証する
**価値**: テストセレクタの一貫性が保たれる
**理由**: 不統一な命名はテストの保守性を下げる

## 受け入れ条件（EARS記法）

- [x] WHEN コンポーネントにdata-testid属性を追加する際
      GIVEN kebab-case形式でない場合
      THEN ESLintが警告を出す

- [x] WHEN data-testid属性を使用する際
      GIVEN `{component}-{element}-{variant?}` パターンに従う場合
      THEN ESLintエラーが発生しない

- [x] WHERE data-testid属性
      IF 命名規則ドキュメントが存在する場合
      THE SYSTEM SHALL 命名パターンを明文化する

## 設計

### 命名規則

```
パターン: {component}-{element}-{variant?}

例:
- article-card           # コンポーネント全体
- article-card-title     # コンポーネント内要素
- pack-selector-horror   # バリアント付き
- next-button            # シンプルな要素
- onboarding-progress    # 画面固有要素
```

### ESLint設定

`eslint-plugin-testing-library` の `prefer-screen-queries` ルールを活用するか、カスタムルールを追加。

```javascript
// .eslintrc.js または eslint.config.js
{
  rules: {
    // data-testid の kebab-case 強制は
    // eslint-plugin-jsx-a11y や カスタムルールで対応
  }
}
```

### 代替案: ドキュメントベース

ESLintルール実装が複雑な場合、命名規則ドキュメントを作成し、PRレビューで検証する。

```markdown
# data-testid 命名規則

## 必須パターン

- kebab-case のみ使用
- `{component}-{element}` 形式

## 禁止パターン

- camelCase: `articleCard` ❌
- snake_case: `article_card` ❌
- 数字始まり: `1-button` ❌
```

## テストケース

- [x] 正しい命名（kebab-case）でESLintエラーが出ない
- [x] 不正な命名でESLint警告/エラーが出る
- [x] 命名規則ドキュメントが存在する

## 実装メモ

- カスタムESLintルール `local/data-testid-naming` で自動検証を実装
- 命名規則ドキュメント `apps/web/TESTING.md` を作成
- 既存コードは全てkebab-case準拠済み

## 実装状況

- **status**: completed
