/**
 * OpenAI Embedding Generator
 * Generates embeddings for SCP articles using OpenAI API
 */

import OpenAI from "openai";
import { env } from "../lib/env";

/** Embedding生成結果 */
export interface EmbeddingResult {
  articleId: string;
  embedding: number[];
  tokenCount: number;
}

/** Embedding処理の統計情報 */
export interface EmbeddingStats {
  totalArticles: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  estimatedCost: number;
}

/** エラー情報 */
export interface EmbeddingError {
  articleId: string;
  error: string;
}

/** バッチ処理オプション */
export interface BatchOptions {
  batchSize: number;
  delayMs: number;
  maxRetries: number;
}

const DEFAULT_BATCH_OPTIONS: BatchOptions = {
  batchSize: 10,
  delayMs: 1000,
  maxRetries: 3,
};

/** コスト計算定数（USD per 1M tokens） */
const COST_PER_MILLION_TOKENS = 0.02;

/** OpenAIクライアントのシングルトン */
let _openaiClient: OpenAI | null = null;

const getOpenAIClient = (): OpenAI => {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }
  return _openaiClient;
};

/**
 * テキストを前処理（HTMLタグ除去、空白正規化、長さ制限）
 */
export const preprocessContent = (content: string): string => {
  // HTMLタグ除去
  const withoutHtml = content.replace(/<[^>]*>/g, " ");

  // 空白正規化
  const normalized = withoutHtml.replace(/\s+/g, " ").trim();

  // 最大30000文字に制限（約8000トークン相当、安全マージン）
  return normalized.slice(0, 30000);
};

/**
 * コスト計算
 */
export const calculateCost = (totalTokens: number): number =>
  (totalTokens / 1_000_000) * COST_PER_MILLION_TOKENS;

/**
 * 指数バックオフでの待機
 */
const exponentialBackoff = (attempt: number, baseDelayMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, baseDelayMs * Math.pow(2, attempt)));

/**
 * 単一テキストのEmbedding生成
 */
export const generateEmbedding = async (
  text: string,
  maxRetries: number = DEFAULT_BATCH_OPTIONS.maxRetries
): Promise<{ embedding: number[]; tokenCount: number }> => {
  const openai = getOpenAIClient();
  const processedText = preprocessContent(text);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: processedText,
      });

      return {
        embedding: response.data[0].embedding,
        tokenCount: response.usage?.total_tokens ?? 0,
      };
    } catch (error) {
      const isRateLimitError =
        error instanceof Error &&
        (error.message.includes("rate_limit") || error.message.includes("429"));

      if (isRateLimitError && attempt < maxRetries) {
        console.log(`  ⏳ Rate limit hit, retrying in ${Math.pow(2, attempt)}s...`);
        await exponentialBackoff(attempt, 1000);
        continue;
      }

      throw error;
    }
  }

  throw new Error("Max retries exceeded");
};

/**
 * 複数記事のEmbeddingをバッチ生成
 */
export const generateEmbeddingsBatch = async (
  articles: Array<{ id: string; content: string }>,
  options: Partial<BatchOptions> = {}
): Promise<{
  results: EmbeddingResult[];
  errors: EmbeddingError[];
  stats: EmbeddingStats;
}> => {
  const opts = { ...DEFAULT_BATCH_OPTIONS, ...options };
  const results: EmbeddingResult[] = [];
  const errors: EmbeddingError[] = [];
  let totalTokens = 0;

  console.log(`Processing ${articles.length} articles in batches of ${opts.batchSize}...`);

  for (let i = 0; i < articles.length; i += opts.batchSize) {
    const batch = articles.slice(i, i + opts.batchSize);
    const batchNumber = Math.floor(i / opts.batchSize) + 1;
    const totalBatches = Math.ceil(articles.length / opts.batchSize);

    console.log(`\n📦 Batch ${batchNumber}/${totalBatches}`);

    for (const article of batch) {
      try {
        console.log(`  Processing ${article.id}...`);
        const { embedding, tokenCount } = await generateEmbedding(article.content, opts.maxRetries);

        results.push({
          articleId: article.id,
          embedding,
          tokenCount,
        });
        totalTokens += tokenCount;

        console.log(`  ✅ ${article.id}: ${tokenCount} tokens`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`  ❌ ${article.id}: ${errorMessage}`);
        errors.push({
          articleId: article.id,
          error: errorMessage,
        });
      }
    }

    // バッチ間の待機（最後のバッチ以外）
    if (i + opts.batchSize < articles.length) {
      console.log(`  ⏳ Waiting ${opts.delayMs}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, opts.delayMs));
    }
  }

  const stats: EmbeddingStats = {
    totalArticles: articles.length,
    successCount: results.length,
    errorCount: errors.length,
    totalTokens,
    estimatedCost: calculateCost(totalTokens),
  };

  return { results, errors, stats };
};

/**
 * 統計情報を表示
 */
export const printStats = (stats: EmbeddingStats): void => {
  console.log("\n📊 Statistics:");
  console.log(`  Total articles: ${stats.totalArticles}`);
  console.log(`  Success: ${stats.successCount}`);
  console.log(`  Errors: ${stats.errorCount}`);
  console.log(`  Total tokens: ${stats.totalTokens.toLocaleString()}`);
  console.log(`  Estimated cost: $${stats.estimatedCost.toFixed(4)}`);
};

/**
 * エラー一覧を表示
 */
export const printErrors = (errors: EmbeddingError[]): void => {
  if (errors.length === 0) return;

  console.log("\n❌ Errors:");
  errors.forEach(({ articleId, error }) => {
    console.log(`  ${articleId}: ${error}`);
  });
};
