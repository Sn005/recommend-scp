/**
 * リトライプロセッサ
 * Subtask: 003-04-03
 *
 * リトライキューの処理を担当。
 * 失敗した記事の自動再処理、エクスポネンシャルバックオフによるリトライスケジュール管理。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createLogger, type Logger } from "../crawler/utils/logger";

/** リトライキューレコード */
export interface RetryQueueRecord {
  id: number;
  article_id: string;
  task_type: "embedding" | "tagging";
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  next_retry_at: string;
  created_at: string;
}

/** リトライ結果 */
export interface RetryResult {
  processed: number;
  succeeded: number;
  failed: number;
  exhausted: number;
  exhaustedArticles: ExhaustedArticle[];
}

/** 最大リトライ到達記事 */
interface ExhaustedArticle {
  articleId: string;
  taskType: "embedding" | "tagging";
  lastError: string;
}

/** Embeddingプロセッサインターフェース */
interface EmbeddingProcessorInterface {
  processArticle(articleId: string): Promise<{ success: boolean }>;
}

/** タグ抽出プロセッサインターフェース */
interface TaggingProcessorInterface {
  processArticle(articleId: string): Promise<{ success: boolean }>;
}

/** リトライプロセッサオプション */
export interface RetryProcessorOptions {
  supabaseClient: SupabaseClient;
  embeddingProcessor: EmbeddingProcessorInterface;
  taggingProcessor: TaggingProcessorInterface;
  logger?: Logger;
  /** 最大リトライ回数（デフォルト: 3） */
  maxRetries?: number;
}

/**
 * リトライプロセッサ
 */
export class RetryProcessor {
  private readonly supabase: SupabaseClient;
  private readonly embeddingProcessor: EmbeddingProcessorInterface;
  private readonly taggingProcessor: TaggingProcessorInterface;
  private readonly logger: Logger;
  private readonly maxRetries: number;

  /** バックオフの基準時間（ミリ秒）: 1時間 */
  private readonly BACKOFF_BASE_MS = 60 * 60 * 1000;

  constructor(options: RetryProcessorOptions) {
    this.supabase = options.supabaseClient;
    this.embeddingProcessor = options.embeddingProcessor;
    this.taggingProcessor = options.taggingProcessor;
    this.logger = options.logger ?? createLogger({ prefix: "[RetryProcessor]" });
    this.maxRetries = options.maxRetries ?? 3;
  }

  /**
   * リトライキューを処理
   */
  async processRetryQueue(): Promise<RetryResult> {
    const result: RetryResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      exhausted: 0,
      exhaustedArticles: [],
    };

    // リトライ対象を取得
    const pendingRetries = await this.getPendingRetries();

    if (pendingRetries.length === 0) {
      this.logger.info("📋 リトライ対象なし");
      return result;
    }

    this.logger.info(`📋 リトライ対象: ${String(pendingRetries.length)}件`);

    // 各記事を処理
    for (const retry of pendingRetries) {
      result.processed++;

      try {
        // タスクタイプに応じて処理を実行
        if (retry.task_type === "embedding") {
          await this.embeddingProcessor.processArticle(retry.article_id);
        } else {
          await this.taggingProcessor.processArticle(retry.article_id);
        }

        // 成功: キューから削除
        await this.removeFromQueue(retry.id);
        result.succeeded++;
        this.logger.info(`  ✅ ${retry.article_id} (${retry.task_type}): 成功`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const newRetryCount = retry.retry_count + 1;

        if (newRetryCount >= this.maxRetries) {
          // 最大リトライ到達
          await this.removeFromQueue(retry.id);
          result.exhausted++;
          result.exhaustedArticles.push({
            articleId: retry.article_id,
            taskType: retry.task_type,
            lastError: errorMessage,
          });
          this.logger.error(
            `  ❌ 最大リトライ到達: ${retry.article_id} (${retry.task_type}): ${errorMessage}`
          );
        } else {
          // 次回リトライをスケジュール
          const nextRetryAt = this.calculateNextRetryAt(retry.retry_count);
          await this.updateRetryQueue(retry.id, {
            retry_count: newRetryCount,
            next_retry_at: nextRetryAt.toISOString(),
            last_error: errorMessage,
          });
          result.failed++;
          this.logger.info(
            `  ⏳ ${retry.article_id} (${retry.task_type}): 失敗 (${String(newRetryCount)}/${String(this.maxRetries)}回目)`
          );
        }
      }
    }

    return result;
  }

  /**
   * リトライ対象を取得
   */
  private async getPendingRetries(): Promise<RetryQueueRecord[]> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("retry_queue")
      .select("*")
      .lte("next_retry_at", now)
      .order("next_retry_at", { ascending: true });

    if (error) {
      throw new Error(`リトライキューの取得に失敗しました: ${error.message}`);
    }

    // error チェック済みなので data は非null
    return data as RetryQueueRecord[];
  }

  /**
   * リトライキューから削除
   */
  private async removeFromQueue(id: number): Promise<void> {
    const { error } = await this.supabase.from("retry_queue").delete().eq("id", id);

    if (error) {
      throw new Error(`リトライキューからの削除に失敗しました: ${error.message}`);
    }
  }

  /**
   * リトライキューを更新
   */
  private async updateRetryQueue(id: number, data: Partial<RetryQueueRecord>): Promise<void> {
    const { error } = await this.supabase.from("retry_queue").update(data).eq("id", id);

    if (error) {
      throw new Error(`リトライキューの更新に失敗しました: ${error.message}`);
    }
  }

  /**
   * エクスポネンシャルバックオフで次回リトライ時刻を計算
   * 計算式: 1時間 × 4^(retry_count)
   * - 1回目失敗 (retry_count: 0): 1時間後
   * - 2回目失敗 (retry_count: 1): 4時間後
   * - 3回目失敗 (retry_count: 2): 16時間後
   */
  private calculateNextRetryAt(currentRetryCount: number): Date {
    const delayMs = this.calculateNextRetryDelay(currentRetryCount);
    return new Date(Date.now() + delayMs);
  }

  /**
   * 次回リトライまでの遅延時間を計算（ミリ秒）
   * テスト用に公開
   */
  calculateNextRetryDelay(currentRetryCount: number): number {
    return this.BACKOFF_BASE_MS * Math.pow(4, currentRetryCount);
  }

  /**
   * リトライレポートを出力
   */
  printReport(result: RetryResult): void {
    this.logger.info(`\n📊 リトライ結果:`);
    this.logger.info(`  処理: ${String(result.processed)}件`);
    this.logger.info(`  成功: ${String(result.succeeded)}件`);
    this.logger.info(`  失敗: ${String(result.failed)}件 (次回リトライ予定)`);
    this.logger.info(`  最大リトライ到達: ${String(result.exhausted)}件`);

    if (result.exhaustedArticles.length > 0) {
      this.logger.warn(`\n⚠️ 最大リトライ到達した記事:`);
      for (const article of result.exhaustedArticles) {
        this.logger.warn(`  - ${article.articleId} (${article.taskType}): ${article.lastError}`);
      }
    }
  }
}
