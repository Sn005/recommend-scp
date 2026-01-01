# Subtask-001-03-01: OpenAI Embedding生成スクリプト実装

## 概要

OpenAI text-embedding-3-small を使用してSCP記事をベクトル化し、Supabase pgvectorに保存する。

## ユーザーストーリー

**As a** 開発者
**I want** SCP記事のEmbeddingを生成する
**So that** ベクトル類似度検索ができるようになる

## Acceptance Criteria（EARS記法）

### Embedding生成

- [ ] WHEN 開発者がEmbedding生成スクリプトを実行した際
      GIVEN scp_articlesテーブルにデータが存在する場合
      THEN 各記事のcontentに対してOpenAI APIを呼び出す
      AND 1536次元のベクトルが返される

- [ ] WHEN Embedding生成が完了した際
      GIVEN 全記事の処理が終了した場合
      THEN 使用トークン数を集計して出力する
      AND 推定費用（$0.02/1Mトークン）を計算して出力する

### データ保存

- [ ] WHEN Embeddingが生成された際
      GIVEN ベクトルデータが有効な場合
      THEN scp_embeddingsテーブルにupsertされる
      AND article_id と embedding が保存される

- [ ] WHEN 既存のEmbeddingがある記事を処理した際
      GIVEN 同じarticle_idのレコードが存在する場合
      THEN 既存レコードが更新される（upsert動作）

### バッチ処理

- [ ] WHEN 大量の記事を処理する際
      GIVEN 10件以上の記事がある場合
      THEN APIレート制限を考慮してバッチ処理する
      AND 各バッチ間に適切な待機時間を設ける

### エラーハンドリング

- [ ] WHEN API呼び出しに失敗した際
      GIVEN レート制限エラーが発生した場合
      THEN 指数バックオフでリトライする
      AND 最大3回までリトライする

- [ ] WHEN 一部の記事でエラーが発生した際
      GIVEN 他の記事は正常に処理できる場合
      THEN エラーが発生した記事をスキップして続行する
      AND エラー一覧を最後に出力する

## 設計

### OpenAI API使用

```typescript
// src/embedding/generate.ts

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

export interface EmbeddingResult {
  articleId: string;
  embedding: number[];
  tokenCount: number;
}

export interface EmbeddingStats {
  totalArticles: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  estimatedCost: number;  // USD
}
```

### テキスト前処理

```typescript
export function preprocessContent(content: string): string {
  // HTMLタグ除去
  const text = content.replace(/<[^>]*>/g, '');

  // 空白正規化
  const normalized = text.replace(/\s+/g, ' ').trim();

  // 最大8000トークン程度に制限（安全マージン）
  // text-embedding-3-smallの最大入力は8191トークン
  return normalized.slice(0, 30000);  // 約8000トークン相当
}
```

### コスト計算

```typescript
const COST_PER_MILLION_TOKENS = 0.02;  // USD

export function calculateCost(totalTokens: number): number {
  return (totalTokens / 1_000_000) * COST_PER_MILLION_TOKENS;
}
```

### スクリプト実行

```bash
# 全記事のEmbedding生成
pnpm --filter poc run:02-embed

# 特定の記事のみ
pnpm --filter poc run:02-embed -- --id SCP-173

# ドライラン（API呼び出しなし、トークン数のみ計算）
pnpm --filter poc run:02-embed -- --dry-run
```

### 環境変数

```env
OPENAI_API_KEY=sk-xxx
```

## テストケース

- [ ] OpenAI APIが正常に呼び出せる
- [ ] 1536次元のベクトルが返される
- [ ] scp_embeddingsテーブルにデータが保存される
- [ ] トークン数と費用が正しく計算される
- [ ] 2回実行しても重複データが作成されない
- [ ] エラー時にリトライが実行される
