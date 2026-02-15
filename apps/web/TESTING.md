# テストガイド

## data-testid 命名規則

### 概要

E2Eテスト（Playwright）で使用する `data-testid` 属性は、一貫した命名規則に従う必要があります。
ESLintカスタムルール `local/data-testid-naming` で自動検証されます。

### 命名パターン

```
{component}-{element}-{variant?}
```

- **component**: コンポーネント名（kebab-case）
- **element**: 要素名（kebab-case）
- **variant**: オプション。バリアントやコンテキスト（kebab-case）

### 使用例

```tsx
{
  /* コンポーネント全体 */
}
<div data-testid="article-card">...</div>;

{
  /* コンポーネント内要素 */
}
<h2 data-testid="article-card-title">...</h2>;

{
  /* バリアント付き */
}
<button data-testid="pack-selector-horror">...</button>;

{
  /* シンプルな要素 */
}
<button data-testid="next-button">...</button>;

{
  /* 画面固有要素 */
}
<div data-testid="onboarding-progress">...</div>;
```

### 禁止パターン

| パターン     | 例              | 理由                   |
| ------------ | --------------- | ---------------------- |
| camelCase    | `articleCard`   | kebab-case のみ許可    |
| snake_case   | `article_card`  | kebab-case のみ許可    |
| 数字始まり   | `1-button`      | 英字小文字で始めること |
| 大文字混在   | `Article-card`  | 全て小文字であること   |
| 連続ハイフン | `article--card` | ハイフンは1つずつ      |
| 空文字列     | `""`            | 値を必ず指定すること   |

### ESLint検証

`eslint-rules/data-testid-naming.mjs` で自動検証されます。

```bash
# Lint実行
pnpm --filter web lint

# 違反例: ESLintが警告を出す
# <div data-testid="articleCard" />
# → warning: data-testid は kebab-case 形式で記述してください
```

### 動的生成の注意点

テンプレートリテラルで動的に生成する場合、ESLintの静的解析では検出されません。
PRレビュー時に命名規則に準拠していることを確認してください。

```tsx
{
  /* ESLint検出対象外 - PRレビューで確認 */
}
<div data-testid={`pack-selector-${genre}`}>...</div>;
```

### Playwrightでの使用例

```typescript
// ページオブジェクトでの使用
const articleCard = page.getByTestId("article-card");
const title = page.getByTestId("article-card-title");

// アサーション
await expect(articleCard).toBeVisible();
await expect(title).toHaveText("SCP-173");
```
