/**
 * パイプラインオーケストレーター型定義
 * Subtask: 003-04-01
 */

import type { CrawlResult, DiffCrawlResult } from "../crawler/types";
import type { BatchEmbeddingResult, CostEstimate } from "../processing/batch-embedding";
import type { BatchTaggingResult, TaggingCostEstimate } from "../processing/batch-tagging";

/** パイプライン実行モード */
export type PipelineMode = "full" | "diff" | "embedding" | "tagging";

/** パイプライン設定 */
export interface PipelineConfig {
  /** 実行モード */
  mode: PipelineMode;
  /** 言語コード（デフォルト: 'en'） */
  lang?: string;
  /** コスト上限（USD） */
  costLimit?: number;
  /** ドライランモード */
  dryRun?: boolean;
  /** 再開する実行ID */
  resumeFromRun?: string;
}

/** パイプライン実行結果 */
export interface PipelineResult {
  runId: string;
  mode: PipelineMode;
  status: "completed" | "failed";
  crawl?: CrawlResult | DiffCrawlResult;
  embedding?: BatchEmbeddingResult;
  tagging?: BatchTaggingResult;
  totalCost: number;
  duration: number;
  error?: string;
}

/** パイプライン統計 */
export interface PipelineStats {
  crawl?: {
    newCount?: number;
    updatedCount?: number;
    deletedCount?: number;
    successCount?: number;
    failedCount?: number;
  };
  embedding?: {
    processed: number;
    succeeded: number;
    failed: number;
    tokens: number;
    cost: number;
  };
  tagging?: {
    processed: number;
    succeeded: number;
    failed: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  totalCost: number;
  duration: number;
}

/** チェックポイントフェーズ */
export type CheckpointPhase =
  | "started"
  | "crawl_completed"
  | "embedding_completed"
  | "tagging_completed";

/** チェックポイント */
export interface PipelineCheckpoint {
  phase: CheckpointPhase;
  result?: CrawlResult | DiffCrawlResult | BatchEmbeddingResult | BatchTaggingResult;
  timestamp: string;
}

/** パイプライン実行レコード（DBスキーマ） */
export interface PipelineRunRecord {
  id: string;
  run_type: "full_crawl" | "diff_crawl" | "embedding" | "tagging" | "full_pipeline";
  status: "running" | "completed" | "failed" | "cancelled";
  started_at: string;
  completed_at?: string;
  stats?: PipelineStats;
  error_message?: string;
  checkpoint?: PipelineCheckpoint;
}

/** コスト見積もり結果 */
export interface PipelineCostEstimate {
  embedding: CostEstimate;
  tagging: TaggingCostEstimate;
  totalCost: number;
}

/** 通知設定 */
export interface NotificationConfig {
  enabled: boolean;
  email?: string;
  warningThreshold?: number; // 失敗率% (デフォルト: 10)
}

/** リトライ結果 */
export interface RetryResult {
  processed: number;
  succeeded: number;
  failed: number;
  exhausted: number;
}
