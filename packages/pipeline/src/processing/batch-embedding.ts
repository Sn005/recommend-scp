/**
 * バッチEmbedding処理
 * Subtask: 003-03-01
 *
 * 大規模なEmbedding生成をバッチ処理で効率的に実行する。
 * ステータス管理、コスト見積もり、進捗表示、リトライ機能を実装。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type OpenAI from "openai";

/** 100万トークンあたりのコスト（text-embedding-3-small） */
export const COST_PER_MILLION_TOKENS = 0.02;

/** 最大コンテンツ長（約8000トークン） */
const MAX_CONTENT_LENGTH = 30000;

/** デフォルトのバッチサイズ */
const DEFAULT_BATCH_SIZE = 10;

/** バッチ間の遅延（ミリ秒） */
const BATCH_DELAY_MS = 1000;

/** 最大リトライ回数 */
const MAX_RETRIES = 3;

/** リトライ基準遅延（ミリ秒） */
const BASE_RETRY_DELAY_MS = 1000;

/** DB記事型 */
export interface DbArticle {
  id: string;
  title: string;
  content: string;
  content_hash: string;
  rating: number;
  lang: string;
  embedding_status: "pending" | "processing" | "completed" | "error";
  last_processed_at: string | null;
  embedding: number[] | null;
}

/** バッチ処理オプション */
export interface BatchEmbeddingOptions {
  /** バッチサイズ（デフォルト: 10） */
  batchSize?: number;
  /** コスト上限（USD） */
  costLimit?: number;
  /** ドライランモード */
  dryRun?: boolean;
  /** 進捗コールバック */
  onProgress?: (progress: EmbeddingProgress) => void;
}

/** 進捗情報 */
export interface EmbeddingProgress {
  processed: number;
  total: number;
  succeeded: number;
  failed: number;
  currentTokens: number;
  estimatedCost: number;
  estimatedTimeRemaining: number;
}

/** コスト見積もり結果 */
export interface CostEstimate {
  estimatedTokens: number;
  estimatedCost: number;
}

/** エラー情報 */
export interface EmbeddingError {
  articleId: string;
  error: string;
}

/** バッチ処理結果 */
export interface BatchEmbeddingResult {
  processed: number;
  succeeded: number;
  failed: number;
  totalTokens: number;
  actualCost: number;
  duration: number;
  errors: EmbeddingError[];
}

/** プロセッサ初期化オプション */
export interface ProcessorOptions {
  supabaseClient: SupabaseClient;
  openaiClient: OpenAI;
}

/**
 * コンテンツを前処理する
 * - HTMLタグを除去
 * - 空白を正規化
 * - 最大長でトランケート
 */
function preprocessContent(content: string): string {
  const withoutTags = content.replace(/<[^>]*>/g, "");
  const normalized = withoutTags.replace(/\s+/g, " ").trim();
  return normalized.slice(0, MAX_CONTENT_LENGTH);
}

/**
 * トークン数を推定する（1トークン ≈ 4文字）
 */
function estimateTokens(content: string): number {
  const preprocessed = preprocessContent(content);
  return Math.ceil(preprocessed.length / 4);
}

/**
 * コストを計算する
 */
function calculateCost(totalTokens: number): number {
  return (totalTokens / 1_000_000) * COST_PER_MILLION_TOKENS;
}

/**
 * 遅延ユーティリティ
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * レート制限エラーかどうかを判定
 */
function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const err = error as Error & { status?: number };
  return err.message.includes("rate limit") || err.message.includes("429") || err.status === 429;
}

/**
 * バッチEmbeddingプロセッサ
 */
export class BatchEmbeddingProcessor {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor(options: ProcessorOptions) {
    this.supabase = options.supabaseClient;
    this.openai = options.openaiClient;
  }

  /**
   * 未処理記事を取得する
   */
  async getPendingArticles(limit = 10000): Promise<DbArticle[]> {
    const { data, error } = await this.supabase
      .from("scp_articles")
      .select("*")
      .eq("embedding_status", "pending")
      .limit(limit);

    if (error) {
      throw new Error(`未処理記事の取得に失敗しました: ${error.message}`);
    }

    return (data as DbArticle[] | null) ?? [];
  }

  /**
   * コスト見積もりを計算する
   */
  estimateCost(articles: DbArticle[]): CostEstimate {
    const estimatedTokens = articles.reduce(
      (sum, article) => sum + estimateTokens(article.content),
      0
    );
    const estimatedCost = calculateCost(estimatedTokens);

    return {
      estimatedTokens,
      estimatedCost,
    };
  }

  /**
   * 単一記事のEmbeddingを生成する（リトライ付き）
   */
  private async generateEmbeddingWithRetry(
    content: string
  ): Promise<{ embedding: number[]; tokenCount: number }> {
    const preprocessed = preprocessContent(content);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.openai.embeddings.create({
          model: "text-embedding-3-small",
          input: preprocessed,
        });

        return {
          embedding: response.data[0].embedding,
          tokenCount: response.usage.total_tokens,
        };
      } catch (error) {
        lastError = error as Error;

        if (isRateLimitError(error) && attempt < MAX_RETRIES - 1) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }

        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
      }
    }

    throw lastError ?? new Error("Unknown error");
  }

  /**
   * ステータスを更新する
   */
  private async updateStatus(
    articleId: string,
    status: DbArticle["embedding_status"],
    embedding?: number[],
    lastProcessedAt?: string
  ): Promise<void> {
    const updateData: Partial<DbArticle> = {
      embedding_status: status,
    };

    if (embedding !== undefined) {
      updateData.embedding = embedding;
    }

    if (lastProcessedAt !== undefined) {
      updateData.last_processed_at = lastProcessedAt;
    }

    await this.supabase.from("scp_articles").update(updateData).eq("id", articleId);
  }

  /**
   * リトライキューに追加する
   */
  private async addToRetryQueue(articleId: string, errorMessage: string): Promise<void> {
    await this.supabase.from("retry_queue").upsert(
      {
        article_id: articleId,
        operation: "embedding",
        last_error: errorMessage,
        retry_count: 1,
        created_at: new Date().toISOString(),
      },
      { onConflict: "article_id,operation" }
    );
  }

  /**
   * バッチ処理を実行する
   */
  async process(options: BatchEmbeddingOptions = {}): Promise<BatchEmbeddingResult> {
    const { batchSize = DEFAULT_BATCH_SIZE, costLimit, dryRun = false, onProgress } = options;

    const startTime = Date.now();
    const errors: EmbeddingError[] = [];
    let succeeded = 0;
    let failed = 0;
    let totalTokens = 0;

    // 1. 未処理記事を取得
    const articles = await this.getPendingArticles();
    const total = articles.length;

    if (total === 0) {
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        totalTokens: 0,
        actualCost: 0,
        duration: Date.now() - startTime,
        errors: [],
      };
    }

    // 2. コスト見積もり
    const estimate = this.estimateCost(articles);

    // 3. コスト上限チェック
    if (costLimit !== undefined && estimate.estimatedCost > costLimit) {
      throw new Error(
        `コスト上限超過: $${estimate.estimatedCost.toFixed(4)} > $${String(costLimit)}`
      );
    }

    // 4. ドライラン
    if (dryRun) {
      // 進捗表示
      for (const article of articles) {
        const articleTokens = estimateTokens(article.content);
        totalTokens += articleTokens;
        succeeded++;

        onProgress?.({
          processed: succeeded,
          total,
          succeeded,
          failed: 0,
          currentTokens: totalTokens,
          estimatedCost: calculateCost(totalTokens),
          estimatedTimeRemaining: 0,
        });
      }

      return {
        processed: total,
        succeeded: total,
        failed: 0,
        totalTokens: estimate.estimatedTokens,
        actualCost: estimate.estimatedCost,
        duration: Date.now() - startTime,
        errors: [],
      };
    }

    // 5. バッチ処理実行
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);

      for (const article of batch) {
        try {
          // ステータスをprocessingに更新
          await this.updateStatus(article.id, "processing");

          // Embedding生成
          const { embedding, tokenCount } = await this.generateEmbeddingWithRetry(article.content);

          totalTokens += tokenCount;

          // 成功時の更新
          await this.updateStatus(article.id, "completed", embedding, new Date().toISOString());

          succeeded++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ articleId: article.id, error: errorMessage });
          failed++;

          // エラー時の更新
          await this.updateStatus(article.id, "error");
          await this.addToRetryQueue(article.id, errorMessage);
        }

        // 進捗表示
        const elapsed = Date.now() - startTime;
        const processed = succeeded + failed;
        const rate = processed / (elapsed / 1000);
        const remaining = total - processed;
        const estimatedTimeRemaining = rate > 0 ? remaining / rate : 0;

        onProgress?.({
          processed,
          total,
          succeeded,
          failed,
          currentTokens: totalTokens,
          estimatedCost: calculateCost(totalTokens),
          estimatedTimeRemaining,
        });
      }

      // バッチ間遅延（最後のバッチ以外）
      if (i + batchSize < articles.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    return {
      processed: succeeded + failed,
      succeeded,
      failed,
      totalTokens,
      actualCost: calculateCost(totalTokens),
      duration: Date.now() - startTime,
      errors,
    };
  }
}
