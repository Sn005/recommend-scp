/**
 * チェックポイント管理ユーティリティ
 * Subtask: 003-02-02
 */

import type { Checkpoint } from "../types";

/** チェックポイント管理オプション */
export interface CheckpointManagerOptions {
  /** チェックポイント保存間隔（デフォルト: 100） */
  interval?: number;
  /** チェックポイント保存時のコールバック */
  onCheckpoint?: (checkpoint: Checkpoint) => void;
}

/**
 * チェックポイントを管理するクラス
 */
export class CheckpointManager {
  private readonly interval: number;
  private readonly onCheckpoint?: (checkpoint: Checkpoint) => void;

  constructor(options: CheckpointManagerOptions = {}) {
    this.interval = options.interval ?? 100;
    this.onCheckpoint = options.onCheckpoint;
  }

  /**
   * チェックポイントを保存すべきかどうかを判定
   * @param processedCount 処理済み件数
   */
  shouldSaveCheckpoint(processedCount: number): boolean {
    return processedCount > 0 && processedCount % this.interval === 0;
  }

  /**
   * チェックポイントを作成
   * @param lastProcessedId 最後に処理した記事ID
   * @param processedCount 処理済み件数
   * @param currentSeries 現在処理中のシリーズ
   */
  createCheckpoint(
    lastProcessedId: string,
    processedCount: number,
    currentSeries?: string
  ): Checkpoint {
    return {
      lastProcessedId,
      processedCount,
      timestamp: new Date(),
      currentSeries,
    };
  }

  /**
   * 条件を満たす場合にチェックポイントを作成してコールバックを呼ぶ
   * @param lastProcessedId 最後に処理した記事ID
   * @param processedCount 処理済み件数
   * @param currentSeries 現在処理中のシリーズ
   */
  maybeCreateCheckpoint(
    lastProcessedId: string,
    processedCount: number,
    currentSeries?: string
  ): Checkpoint | null {
    if (!this.shouldSaveCheckpoint(processedCount)) {
      return null;
    }

    const checkpoint = this.createCheckpoint(lastProcessedId, processedCount, currentSeries);
    this.onCheckpoint?.(checkpoint);
    return checkpoint;
  }

  /**
   * チェックポイントから再開するインデックスを取得
   * @param items アイテムの配列（文字列または{id: string}を持つオブジェクト）
   * @param checkpoint 再開元のチェックポイント
   */
  getResumeIndex(
    items: (string | { id: string })[],
    checkpoint: Checkpoint | null | undefined
  ): number {
    if (!checkpoint) {
      return 0;
    }

    const getId = (item: string | { id: string }): string =>
      typeof item === "string" ? item : item.id;

    const index = items.findIndex((item) => getId(item) === checkpoint.lastProcessedId);

    if (index === -1) {
      return 0;
    }

    // 見つかったインデックスの次から再開
    return index + 1;
  }
}
