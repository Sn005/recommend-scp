# Subtask-001-04-01: LLMタグ抽出スクリプト実装

## 概要

LLM（Claude or GPT）を使用してSCP記事から構造化されたタグを抽出し、データベースに保存する。

## ユーザーストーリー

**As a** 開発者
**I want** LLMで記事からタグを自動抽出する
**So that** ハイブリッド検索の明示的タグデータを準備できる

## Acceptance Criteria（EARS記法）

### タグ抽出

- [x] WHEN 開発者がタグ抽出スクリプトを実行した際
      GIVEN scp_articlesテーブルにデータが存在する場合
      THEN 各記事に対してLLMを呼び出す
      AND 以下のカテゴリのタグを抽出する：
      - object_class: Safe, Euclid, Keter, Thaumiel, Neutralized, その他
      - genre: horror, sci-fi, fantasy, comedy, tragedy, その他（複数可）
      - theme: cognition, reality-bending, extradimensional, biological, mechanical, その他（複数可）
      - format: standard, exploration-log, interview, experiment-log, その他

- [x] WHEN タグ抽出結果を確認した際
      GIVEN LLMが応答した場合
      THEN JSON形式で構造化されたタグが返される
      AND 各カテゴリに少なくとも1つのタグが含まれる

### データ保存

- [x] WHEN タグが抽出された際
      GIVEN 新しいタグ値が出現した場合
      THEN tagsテーブルに新規レコードが作成される

- [x] WHEN 記事とタグの関連付けを保存する際
      GIVEN 抽出されたタグがある場合
      THEN article_tagsテーブルにレコードが作成される
      AND 既存の関連付けは上書きされる

### 抽出精度の評価

- [x] WHEN 全記事のタグ抽出が完了した際
      GIVEN タグデータが保存されている場合
      THEN 各記事のタグ一覧をMarkdownで出力する
      AND 開発者が主観評価できる形式で表示する

### コスト管理

- [x] WHEN タグ抽出が完了した際
      GIVEN LLM APIを使用した場合
      THEN 使用トークン数と推定費用を出力する

## 設計

### 抽出プロンプト

```typescript
const EXTRACTION_PROMPT = `
You are an expert on the SCP Foundation wiki. Analyze the following SCP article and extract structured tags.

Return a JSON object with the following structure:
{
  "object_class": "Safe" | "Euclid" | "Keter" | "Thaumiel" | "Neutralized" | "Other",
  "genre": ["horror", "sci-fi", "fantasy", "comedy", "tragedy"]  // 1-3 items
  "theme": ["cognition", "reality-bending", "extradimensional", "biological", "mechanical", "temporal", "memetic", "antimemetic"]  // 1-5 items
  "format": "standard" | "exploration-log" | "interview" | "experiment-log" | "tale" | "other"
}

Rules:
- object_class: Extract from the article's containment procedures or header
- genre: Identify the dominant tone/atmosphere (can be multiple)
- theme: Identify the core anomalous properties (can be multiple)
- format: Identify the primary documentation style

Article:
---
{content}
---

Return only valid JSON, no explanation.
`;
```

### インターフェース

```typescript
// src/tagging/extract.ts

export interface ExtractedTags {
  object_class: string;
  genre: string[];
  theme: string[];
  format: string;
}

export interface TaggingResult {
  articleId: string;
  tags: ExtractedTags;
  tokenCount: number;
}

export interface TaggingStats {
  totalArticles: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  estimatedCost: number;
  uniqueTags: {
    object_class: string[];
    genre: string[];
    theme: string[];
    format: string[];
  };
}
```

### LLMプロバイダー選択

```typescript
// 環境変数でプロバイダーを切り替え
const TAGGING_PROVIDER = process.env.TAGGING_LLM_PROVIDER || 'claude';

// Claude (Anthropic)
// - claude-3-haiku: 安価で高速
// - 入力: $0.25/1M tokens, 出力: $1.25/1M tokens

// GPT (OpenAI)
// - gpt-4o-mini: 安価で高速
// - 入力: $0.15/1M tokens, 出力: $0.60/1M tokens
```

### スクリプト実行

```bash
# 全記事のタグ抽出
pnpm --filter poc run:03-tag

# 特定の記事のみ
pnpm --filter poc run:03-tag -- --id SCP-173

# ドライラン
pnpm --filter poc run:03-tag -- --dry-run

# プロバイダー指定
TAGGING_LLM_PROVIDER=openai pnpm --filter poc run:03-tag
```

### 環境変数

```env
# Claude使用時
ANTHROPIC_API_KEY=sk-ant-xxx

# OpenAI使用時
OPENAI_API_KEY=sk-xxx

# プロバイダー選択
TAGGING_LLM_PROVIDER=claude  # or openai
```

## テストケース

- [x] LLM APIが正常に呼び出せる
- [x] JSON形式で構造化されたタグが返される
- [x] tagsテーブルにユニークなタグが保存される
- [x] article_tagsテーブルに関連付けが保存される
- [ ] 抽出結果が「感覚的に妥当」である（主観評価）
- [x] 2回実行しても重複タグが作成されない

## 実装状況

- **status**: completed
- **実装ファイル**:
  - `packages/poc/src/tagging/extract.ts` - タグ抽出ロジック
  - `packages/poc/src/tagging/extract.test.ts` - ユニットテスト
  - `packages/poc/scripts/03-tag.ts` - 実行スクリプト
