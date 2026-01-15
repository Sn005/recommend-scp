/**
 * レート制限ユーティリティ
 * Subtask: 003-02-02
 */

/** レート制限オプション */
export interface RateLimiterOptions {
  /** バッチサイズ（デフォルト: 10） */
  batchSize?: number;
  /** バッチ間の遅延（ミリ秒、デフォルト: 1000） */
  batchDelayMs?: number;
  /** 429エラー時のデフォルト待機時間（ミリ秒、デフォルト: 60000） */
  defaultRateLimitWaitMs?: number;
  /** レート制限時のコールバック */
  onRateLimit?: (waitSeconds: number) => void;
}

/** バッチ処理オプション */
export interface BatchProcessOptions {
  /** 進捗コールバック */
  onProgress?: (current: number, total: number) => void;
}

/** 遅延ユーティリティ */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * レート制限を管理するクラス
 */
export class RateLimiter {
  private readonly batchSize: number;
  private readonly batchDelayMs: number;
  private readonly defaultRateLimitWaitMs: number;
  private readonly onRateLimit?: (waitSeconds: number) => void;

  constructor(options: RateLimiterOptions = {}) {
    this.batchSize = options.batchSize ?? 10;
    this.batchDelayMs = options.batchDelayMs ?? 1000;
    this.defaultRateLimitWaitMs = options.defaultRateLimitWaitMs ?? 60000;
    this.onRateLimit = options.onRateLimit;
  }

  /**
   * アイテムをバッチ処理する
   * @param items 処理対象のアイテム
   * @param processor 各アイテムを処理する関数
   * @param options 処理オプション
   * @returns 処理結果の配列
   */
  async processInBatches<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: BatchProcessOptions = {}
  ): Promise<R[]> {
    const { onProgress } = options;
    const results: R[] = [];

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);

      // バッチ内のアイテムを並列処理
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);

      // 進捗通知
      onProgress?.(results.length, items.length);

      // 次のバッチがあれば遅延を挿入
      if (i + this.batchSize < items.length) {
        await delay(this.batchDelayMs);
      }
    }

    return results;
  }

  /**
   * 429エラーに対応する待機処理
   * @param retryAfterSeconds Retry-Afterヘッダーの値（秒）
   */
  async handleRateLimitError(retryAfterSeconds: number | undefined): Promise<void> {
    const waitMs =
      retryAfterSeconds !== undefined ? retryAfterSeconds * 1000 : this.defaultRateLimitWaitMs;

    const waitSeconds = Math.ceil(waitMs / 1000);
    this.onRateLimit?.(waitSeconds);

    await delay(waitMs);
  }
}
