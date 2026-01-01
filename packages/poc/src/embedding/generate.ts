/**
 * OpenAI Embedding Generator
 * Generates embeddings for SCP articles using OpenAI API
 */

import OpenAI from "openai";
import { env } from "../lib/env";

/** Cost per million tokens for text-embedding-3-small */
export const COST_PER_MILLION_TOKENS = 0.02;

/** Maximum content length (approximately 8000 tokens) */
const MAX_CONTENT_LENGTH = 30000;

/** Batch size for processing */
const BATCH_SIZE = 10;

/** Delay between batches in milliseconds */
const BATCH_DELAY_MS = 1000;

/** Maximum retry attempts */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff in milliseconds */
const BASE_RETRY_DELAY_MS = 1000;

export interface EmbeddingResult {
  articleId: string;
  embedding: number[];
  tokenCount: number;
}

export interface EmbeddingError {
  articleId: string;
  error: string;
}

export interface EmbeddingStats {
  totalArticles: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  estimatedCost: number;
  errors: EmbeddingError[];
}

export interface ScpArticle {
  id: string;
  content: string;
}

/**
 * Preprocess content for embedding generation
 * - Removes HTML tags
 * - Normalizes whitespace
 * - Truncates to max length
 */
export function preprocessContent(content: string): string {
  // Remove HTML tags
  const withoutTags = content.replace(/<[^>]*>/g, "");

  // Normalize whitespace
  const normalized = withoutTags.replace(/\s+/g, " ").trim();

  // Truncate to max length
  return normalized.slice(0, MAX_CONTENT_LENGTH);
}

/**
 * Calculate estimated cost based on token count
 */
export function calculateCost(totalTokens: number): number {
  return (totalTokens / 1_000_000) * COST_PER_MILLION_TOKENS;
}

/**
 * Create OpenAI client
 */
function createOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate embedding for a single text with retry logic
 */
export async function generateEmbedding(
  text: string,
  client?: OpenAI
): Promise<{ embedding: number[]; tokenCount: number }> {
  const openai = client ?? createOpenAIClient();
  const preprocessed = preprocessContent(text);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: preprocessed,
      });

      return {
        embedding: response.data[0].embedding,
        tokenCount: response.usage.total_tokens,
      };
    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error
      const isRateLimitError =
        error instanceof Error &&
        (error.message.includes("rate limit") ||
          error.message.includes("429") ||
          (error as { status?: number }).status === 429);

      if (isRateLimitError && attempt < MAX_RETRIES - 1) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.log(
          `Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Generate embeddings for multiple articles with batch processing
 */
export async function generateEmbeddingsForArticles(
  articles: ScpArticle[],
  options: {
    dryRun?: boolean;
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<{ results: EmbeddingResult[]; stats: EmbeddingStats }> {
  const { dryRun = false, onProgress } = options;

  const results: EmbeddingResult[] = [];
  const errors: EmbeddingError[] = [];
  let totalTokens = 0;

  const openai = dryRun ? undefined : createOpenAIClient();

  // Process in batches
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);

    for (const article of batch) {
      try {
        if (dryRun) {
          // Estimate token count (rough approximation: 1 token ≈ 4 chars)
          const preprocessed = preprocessContent(article.content);
          const estimatedTokens = Math.ceil(preprocessed.length / 4);
          totalTokens += estimatedTokens;

          results.push({
            articleId: article.id,
            embedding: [],
            tokenCount: estimatedTokens,
          });
        } else {
          const { embedding, tokenCount } = await generateEmbedding(
            article.content,
            openai
          );

          totalTokens += tokenCount;
          results.push({
            articleId: article.id,
            embedding,
            tokenCount,
          });
        }

        onProgress?.(results.length + errors.length, articles.length);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Error processing ${article.id}: ${errorMessage}`);
        errors.push({
          articleId: article.id,
          error: errorMessage,
        });
        onProgress?.(results.length + errors.length, articles.length);
      }
    }

    // Add delay between batches (except for last batch)
    if (i + BATCH_SIZE < articles.length && !dryRun) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const stats: EmbeddingStats = {
    totalArticles: articles.length,
    successCount: results.length,
    errorCount: errors.length,
    totalTokens,
    estimatedCost: calculateCost(totalTokens),
    errors,
  };

  return { results, stats };
}
