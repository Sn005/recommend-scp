/**
 * エクスポネンシャルバックオフによるリトライユーティリティ
 * Subtask: 003-02-02
 */

/** リトライオプション */
export interface RetryOptions {
  /** 最大リトライ回数（デフォルト: 3） */
  maxRetries?: number;
  /** 基準遅延時間（ミリ秒、デフォルト: 1000） */
  baseDelayMs?: number;
  /** リトライ時のコールバック */
  onRetry?: (attempt: number, error: Error) => void;
}

/** 遅延ユーティリティ */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * エクスポネンシャルバックオフでリトライを行う
 * @param fetcher 実行する非同期関数
 * @param options リトライオプション
 * @returns fetcherの戻り値
 */
export const fetchWithRetry = async <T>(
  fetcher: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const { maxRetries = 3, baseDelayMs = 1000, onRetry } = options;

  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        onRetry?.(attempt + 1, lastError);
        await delay(delayMs);
      }
    }
  }

  throw lastError;
};
