/**
 * パイプラインオーケストレーター
 * Subtask: 003-04-01
 *
 * クロール、Embedding生成、タグ抽出を統合実行するオーケストレーター。
 * 実行モード切り替え、コスト制御、進捗ログ、実行履歴管理を含む。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createLogger, type Logger } from "../crawler/utils/logger";
import type { CrawlResult, DiffCrawlResult } from "../crawler/types";
import type { BatchEmbeddingResult, CostEstimate, DbArticle } from "../processing/batch-embedding";
import type {
  BatchTaggingResult,
  TaggingCostEstimate,
  DbTaggingArticle,
} from "../processing/batch-tagging";
import type {
  PipelineConfig,
  PipelineResult,
  PipelineStats,
  PipelineCheckpoint,
  CheckpointPhase,
  PipelineRunRecord,
} from "./types";

/** フルクローラーインターフェース */
interface FullCrawlerInterface {
  runFullCrawl(): Promise<CrawlResult>;
}

/** 差分クローラーインターフェース */
interface DiffCrawlerInterface {
  run(options?: { dryRun?: boolean }): Promise<DiffCrawlResult>;
}

/** Embeddingプロセッサインターフェース */
interface EmbeddingProcessorInterface {
  process(options?: { dryRun?: boolean }): Promise<BatchEmbeddingResult>;
  estimateCost(articles: DbArticle[]): CostEstimate;
  getPendingArticles(): Promise<DbArticle[]>;
}

/** タグ抽出プロセッサインターフェース */
interface TaggingProcessorInterface {
  process(options?: { dryRun?: boolean }): Promise<BatchTaggingResult>;
  estimateCost(articles: DbTaggingArticle[]): TaggingCostEstimate;
  getPendingArticles(): Promise<DbTaggingArticle[]>;
}

/** オーケストレーター初期化オプション */
export interface OrchestratorOptions {
  supabaseClient: SupabaseClient;
  fullCrawler: FullCrawlerInterface;
  diffCrawler: DiffCrawlerInterface;
  embeddingProcessor: EmbeddingProcessorInterface;
  taggingProcessor: TaggingProcessorInterface;
  logger?: Logger;
}

/**
 * run_typeをPipelineModeから導出
 */
function getRunType(mode: PipelineConfig["mode"]): PipelineRunRecord["run_type"] {
  switch (mode) {
    case "full":
      return "full_crawl";
    case "diff":
      return "diff_crawl";
    case "embedding":
      return "embedding";
    case "tagging":
      return "tagging";
    default:
      return "full_pipeline";
  }
}

/**
 * パイプラインオーケストレーター
 */
export class PipelineOrchestrator {
  private readonly supabase: SupabaseClient;
  private readonly fullCrawler: FullCrawlerInterface;
  private readonly diffCrawler: DiffCrawlerInterface;
  private readonly embeddingProcessor: EmbeddingProcessorInterface;
  private readonly taggingProcessor: TaggingProcessorInterface;
  private readonly logger: Logger;

  constructor(options: OrchestratorOptions) {
    this.supabase = options.supabaseClient;
    this.fullCrawler = options.fullCrawler;
    this.diffCrawler = options.diffCrawler;
    this.embeddingProcessor = options.embeddingProcessor;
    this.taggingProcessor = options.taggingProcessor;
    this.logger = options.logger ?? createLogger({ prefix: "[Orchestrator]" });
  }

  /**
   * パイプライン実行レコードを作成
   */
  private async createPipelineRun(config: PipelineConfig): Promise<string> {
    const { data, error } = await this.supabase
      .from("pipeline_runs")
      .insert({
        run_type: getRunType(config.mode),
        status: "running",
        started_at: new Date().toISOString(),
        checkpoint: {
          phase: "started",
          timestamp: new Date().toISOString(),
        },
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`パイプライン実行レコードの作成に失敗しました: ${error.message}`);
    }

    return (data as { id: string }).id;
  }

  /**
   * チェックポイントを更新
   */
  private async updateCheckpoint(
    runId: string,
    phase: CheckpointPhase,
    result?: CrawlResult | DiffCrawlResult | BatchEmbeddingResult | BatchTaggingResult
  ): Promise<void> {
    const checkpoint: PipelineCheckpoint = {
      phase,
      result,
      timestamp: new Date().toISOString(),
    };

    await this.supabase.from("pipeline_runs").update({ checkpoint }).eq("id", runId);
  }

  /**
   * パイプライン実行を完了
   */
  private async completePipelineRun(
    runId: string,
    status: "completed" | "failed",
    stats?: PipelineStats,
    errorMessage?: string
  ): Promise<void> {
    const updateData: Partial<PipelineRunRecord> = {
      status,
      completed_at: new Date().toISOString(),
    };

    if (stats) {
      updateData.stats = stats;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    await this.supabase.from("pipeline_runs").update(updateData).eq("id", runId);
  }

  /**
   * 前回の実行からチェックポイントを取得
   */
  private async getPreviousRunCheckpoint(
    runId: string
  ): Promise<{ checkpoint: PipelineCheckpoint; status: string } | null> {
    const { data, error } = await this.supabase
      .from("pipeline_runs")
      .select("checkpoint, status")
      .eq("id", runId);

    if (error || data.length === 0) {
      return null;
    }

    const record = data[0] as { checkpoint: PipelineCheckpoint; status: string };
    return record;
  }

  /**
   * コスト見積もりを実行
   */
  private async estimateCost(): Promise<{
    embedding: CostEstimate;
    tagging: TaggingCostEstimate;
    total: number;
  }> {
    const embeddingArticles = await this.embeddingProcessor.getPendingArticles();
    const taggingArticles = await this.taggingProcessor.getPendingArticles();

    const embeddingEstimate = this.embeddingProcessor.estimateCost(embeddingArticles);
    const taggingEstimate = this.taggingProcessor.estimateCost(taggingArticles);

    return {
      embedding: embeddingEstimate,
      tagging: taggingEstimate,
      total: embeddingEstimate.estimatedCost + taggingEstimate.estimatedCost,
    };
  }

  /**
   * コスト上限をチェック
   */
  private async checkCostLimit(costLimit: number): Promise<void> {
    const estimate = await this.estimateCost();

    if (estimate.total > costLimit) {
      throw new Error(
        `コスト上限超過: 見積もり $${estimate.total.toFixed(4)} > 上限 $${costLimit.toFixed(2)}`
      );
    }

    this.logger.info(
      `📊 コスト見積もり: $${estimate.total.toFixed(4)} (上限: $${costLimit.toFixed(2)})`
    );
  }

  /**
   * 実行中のコストを監視し、90%到達時に警告
   */
  private checkCostWarning(currentCost: number, costLimit: number | undefined): void {
    if (!costLimit) return;

    const percentage = (currentCost / costLimit) * 100;
    if (percentage >= 90) {
      this.logger.warn(
        `⚠️ コスト上限の${percentage.toFixed(1)}%に達しました: $${currentCost.toFixed(4)}`
      );
    }
  }

  /**
   * パイプラインを実行
   */
  async run(config: PipelineConfig): Promise<PipelineResult> {
    const startTime = Date.now();
    const { mode, lang = "en", costLimit, dryRun = false, resumeFromRun } = config;

    // 再開モードの処理
    let skipCrawl = false;
    let skipEmbedding = false;

    if (resumeFromRun) {
      const previousRun = await this.getPreviousRunCheckpoint(resumeFromRun);

      if (!previousRun) {
        throw new Error(`実行IDが見つかりません: ${resumeFromRun}`);
      }

      if (previousRun.status === "completed") {
        throw new Error(`実行ID ${resumeFromRun} は既に完了しています`);
      }

      // チェックポイントに基づいてスキップするフェーズを決定
      const { phase } = previousRun.checkpoint;
      if (
        phase === "crawl_completed" ||
        phase === "embedding_completed" ||
        phase === "tagging_completed"
      ) {
        skipCrawl = true;
      }
      if (phase === "embedding_completed" || phase === "tagging_completed") {
        skipEmbedding = true;
      }

      this.logger.info(`📍 前回の実行から再開: フェーズ=${phase}`);
    }

    // 実行レコード作成
    const runId = await this.createPipelineRun(config);

    this.logger.info(`🚀 パイプライン開始`);
    this.logger.info(`  モード: ${mode}`);
    this.logger.info(`  言語: ${lang}`);
    if (costLimit) {
      this.logger.info(`  コスト上限: $${costLimit.toFixed(2)}`);
    }
    this.logger.info(`  実行ID: ${runId}`);
    if (dryRun) {
      this.logger.info(`  ⚠️ ドライランモード`);
    }

    let crawlResult: CrawlResult | DiffCrawlResult | undefined;
    let embeddingResult: BatchEmbeddingResult | undefined;
    let taggingResult: BatchTaggingResult | undefined;
    let totalCost = 0;

    try {
      // コスト上限チェック（costLimit指定時のみ）
      if (costLimit) {
        await this.checkCostLimit(costLimit);
      }

      // 1. クロールフェーズ
      if (!skipCrawl && (mode === "full" || mode === "diff")) {
        this.logger.info(`\n📥 [1/3] クロール開始...`);
        const crawlStartTime = Date.now();

        if (mode === "full") {
          crawlResult = await this.fullCrawler.runFullCrawl();
        } else {
          crawlResult = await this.diffCrawler.run({ dryRun });
        }

        const crawlDuration = Math.round((Date.now() - crawlStartTime) / 1000);
        this.logger.info(`  ✅ クロール完了 (${String(crawlDuration)}秒)`);

        await this.updateCheckpoint(runId, "crawl_completed", crawlResult);
      }

      // 2. Embeddingフェーズ
      if (!skipEmbedding && mode !== "tagging") {
        this.logger.info(`\n🔢 [2/3] Embedding生成開始...`);
        const embeddingStartTime = Date.now();

        embeddingResult = await this.embeddingProcessor.process({ dryRun });

        totalCost += embeddingResult.actualCost;
        this.checkCostWarning(totalCost, costLimit);

        const embeddingDuration = Math.round((Date.now() - embeddingStartTime) / 1000);
        this.logger.info(
          `  ✅ Embedding完了: ${String(embeddingResult.succeeded)}件処理 (${String(embeddingDuration)}秒)`
        );
        this.logger.info(`     コスト: $${embeddingResult.actualCost.toFixed(4)}`);

        await this.updateCheckpoint(runId, "embedding_completed", embeddingResult);
      }

      // 3. タグ抽出フェーズ
      if (mode !== "embedding") {
        this.logger.info(`\n🏷️ [3/3] タグ抽出開始...`);
        const taggingStartTime = Date.now();

        taggingResult = await this.taggingProcessor.process({ dryRun });

        totalCost += taggingResult.actualCost;
        this.checkCostWarning(totalCost, costLimit);

        const taggingDuration = Math.round((Date.now() - taggingStartTime) / 1000);
        this.logger.info(
          `  ✅ タグ抽出完了: ${String(taggingResult.succeeded)}件処理 (${String(taggingDuration)}秒)`
        );
        this.logger.info(`     コスト: $${taggingResult.actualCost.toFixed(4)}`);

        await this.updateCheckpoint(runId, "tagging_completed", taggingResult);
      }

      // 統計を構築
      const duration = Date.now() - startTime;
      const stats: PipelineStats = {
        totalCost,
        duration,
      };

      if (crawlResult) {
        if ("successCount" in crawlResult) {
          stats.crawl = {
            successCount: crawlResult.successCount,
            failedCount: crawlResult.failedCount,
          };
        } else {
          stats.crawl = {
            newCount: crawlResult.newCount,
            updatedCount: crawlResult.updatedCount,
            deletedCount: crawlResult.deletedCount,
            failedCount: crawlResult.failedCount,
          };
        }
      }

      if (embeddingResult) {
        stats.embedding = {
          processed: embeddingResult.processed,
          succeeded: embeddingResult.succeeded,
          failed: embeddingResult.failed,
          tokens: embeddingResult.totalTokens,
          cost: embeddingResult.actualCost,
        };
      }

      if (taggingResult) {
        stats.tagging = {
          processed: taggingResult.processed,
          succeeded: taggingResult.succeeded,
          failed: taggingResult.failed,
          inputTokens: taggingResult.totalInputTokens,
          outputTokens: taggingResult.totalOutputTokens,
          cost: taggingResult.actualCost,
        };
      }

      // 完了記録
      await this.completePipelineRun(runId, "completed", stats);

      const totalDurationSec = Math.round(duration / 1000);
      this.logger.info(`\n✅ パイプライン完了`);
      this.logger.info(`  合計コスト: $${totalCost.toFixed(4)}`);
      this.logger.info(`  合計時間: ${String(totalDurationSec)}秒`);

      return {
        runId,
        mode,
        status: "completed",
        crawl: crawlResult,
        embedding: embeddingResult,
        tagging: taggingResult,
        totalCost,
        duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 失敗記録
      await this.completePipelineRun(runId, "failed", undefined, errorMessage);

      this.logger.error(`\n❌ パイプライン失敗: ${errorMessage}`);

      throw error;
    }
  }
}
