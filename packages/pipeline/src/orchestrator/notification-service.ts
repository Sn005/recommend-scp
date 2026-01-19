/**
 * 通知サービス
 * Subtask: 003-04-03
 *
 * パイプライン実行結果の通知を担当。
 * 実行サマリーのメール送信、失敗率に基づく警告通知を含む。
 */

import { createLogger, type Logger } from "../crawler/utils/logger";

/** パイプライン統計 */
export interface PipelineStatsForNotification {
  totalCost: number;
  duration: number;
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
    cost: number;
  };
  tagging?: {
    processed: number;
    succeeded: number;
    failed: number;
    cost: number;
  };
}

/** パイプラインエラー */
export interface PipelineError {
  article_id: string;
  task: string;
  error: string;
}

/** パイプラインサマリー */
export interface PipelineSummary {
  runId: string;
  mode: string;
  status: "completed" | "failed";
  stats: PipelineStatsForNotification;
  errors: PipelineError[];
}

/** メール送信インターフェース */
export interface Mailer {
  send(options: { to: string; subject: string; body: string }): Promise<{ success: boolean }>;
}

/** 通知サービス設定 */
export interface NotificationConfig {
  enabled: boolean;
  email?: string;
  warningThreshold?: number; // 失敗率% (デフォルト: 10)
  mailer?: Mailer;
  logger?: Logger;
}

/**
 * 通知サービス
 */
export class NotificationService {
  private readonly enabled: boolean;
  private readonly email: string;
  private readonly warningThreshold: number;
  private readonly mailer: Mailer | undefined;
  private readonly logger: Logger;

  constructor(config: NotificationConfig) {
    this.enabled = config.enabled;
    this.email = config.email ?? "";
    this.warningThreshold = config.warningThreshold ?? 10;
    this.mailer = config.mailer;
    this.logger = config.logger ?? createLogger({ prefix: "[Notification]" });
  }

  /**
   * パイプラインサマリーを送信
   */
  async sendPipelineSummary(summary: PipelineSummary): Promise<void> {
    if (!this.enabled) {
      this.logger.debug("通知が無効のためスキップ");
      return;
    }

    if (!this.mailer) {
      this.logger.warn("メーラーが設定されていません");
      return;
    }

    const failureRate = this.calculateFailureRate(summary.stats);
    const isWarning = failureRate > this.warningThreshold;

    const subject = this.buildSubject(summary, isWarning);
    const body = this.buildBody(summary, failureRate);

    try {
      await this.mailer.send({
        to: this.email,
        subject,
        body,
      });
      this.logger.info(`📧 通知を送信しました: ${subject}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`通知の送信に失敗しました: ${errorMessage}`);
    }
  }

  /**
   * 失敗率を計算（%）
   */
  private calculateFailureRate(stats: PipelineStatsForNotification): number {
    let totalProcessed = 0;
    let totalFailed = 0;

    if (stats.embedding) {
      totalProcessed += stats.embedding.processed;
      totalFailed += stats.embedding.failed;
    }

    if (stats.tagging) {
      totalProcessed += stats.tagging.processed;
      totalFailed += stats.tagging.failed;
    }

    if (totalProcessed === 0) {
      return 0;
    }

    return (totalFailed / totalProcessed) * 100;
  }

  /**
   * メール件名を生成
   */
  private buildSubject(summary: PipelineSummary, isWarning: boolean): string {
    const prefix = isWarning ? "[WARNING] " : "";
    const status = summary.status === "completed" ? "Success" : "FAILED";
    return `${prefix}[SCP Pipeline] ${status} - ${summary.mode}`;
  }

  /**
   * メール本文を生成
   */
  private buildBody(summary: PipelineSummary, failureRate: number): string {
    const durationSec = Math.round(summary.stats.duration / 1000);

    const lines: string[] = [
      "SCP Data Pipeline 実行結果",
      "==========================",
      "",
      `実行ID: ${summary.runId}`,
      `モード: ${summary.mode}`,
      `ステータス: ${summary.status}`,
      "",
      "📊 処理統計:",
      `  合計コスト: $${summary.stats.totalCost.toFixed(4)}`,
      `  実行時間: ${String(durationSec)}秒`,
      `  失敗率: ${failureRate.toFixed(1)}%`,
    ];

    // クロール統計
    if (summary.stats.crawl) {
      lines.push("");
      lines.push("📥 クロール:");
      if (summary.stats.crawl.successCount !== undefined) {
        lines.push(`  成功: ${String(summary.stats.crawl.successCount)}件`);
      }
      if (summary.stats.crawl.newCount !== undefined) {
        lines.push(`  新規: ${String(summary.stats.crawl.newCount)}件`);
      }
      if (summary.stats.crawl.updatedCount !== undefined) {
        lines.push(`  更新: ${String(summary.stats.crawl.updatedCount)}件`);
      }
      if (summary.stats.crawl.deletedCount !== undefined) {
        lines.push(`  削除: ${String(summary.stats.crawl.deletedCount)}件`);
      }
      if (summary.stats.crawl.failedCount !== undefined && summary.stats.crawl.failedCount > 0) {
        lines.push(`  失敗: ${String(summary.stats.crawl.failedCount)}件`);
      }
    }

    // Embedding統計
    if (summary.stats.embedding) {
      lines.push("");
      lines.push("🔢 Embedding:");
      lines.push(`  処理: ${String(summary.stats.embedding.processed)}件`);
      lines.push(`  成功: ${String(summary.stats.embedding.succeeded)}件`);
      if (summary.stats.embedding.failed > 0) {
        lines.push(`  失敗: ${String(summary.stats.embedding.failed)}件`);
      }
      lines.push(`  コスト: $${summary.stats.embedding.cost.toFixed(4)}`);
    }

    // タグ抽出統計
    if (summary.stats.tagging) {
      lines.push("");
      lines.push("🏷️ タグ抽出:");
      lines.push(`  処理: ${String(summary.stats.tagging.processed)}件`);
      lines.push(`  成功: ${String(summary.stats.tagging.succeeded)}件`);
      if (summary.stats.tagging.failed > 0) {
        lines.push(`  失敗: ${String(summary.stats.tagging.failed)}件`);
      }
      lines.push(`  コスト: $${summary.stats.tagging.cost.toFixed(4)}`);
    }

    // エラーサマリー
    if (summary.errors.length > 0) {
      lines.push("");
      lines.push("❌ エラーサマリー:");
      const errorsToShow = summary.errors.slice(0, 10);
      for (const err of errorsToShow) {
        lines.push(`  - ${err.article_id} (${err.task}): ${err.error}`);
      }
      if (summary.errors.length > 10) {
        lines.push(`  ... 他 ${String(summary.errors.length - 10)}件`);
      }
    }

    return lines.join("\n");
  }
}
