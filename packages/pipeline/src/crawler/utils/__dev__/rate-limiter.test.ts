/**
 * レート制限ユーティリティのテスト
 * Subtask: 003-02-02
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("バッチ処理", () => {
    it("バッチ10件ごとに1秒の遅延を挿入する", async () => {
      const limiter = new RateLimiter({ batchSize: 10, batchDelayMs: 1000 });
      const items = Array.from({ length: 25 }, (_, i) => `item-${String(i + 1)}`);
      const processedItems: string[] = [];

      const processor = (item: string) => {
        processedItems.push(item);
        return Promise.resolve(item);
      };

      const promise = limiter.processInBatches(items, processor);

      // 最初の10件は即座に処理
      await vi.advanceTimersByTimeAsync(0);
      expect(processedItems.length).toBe(10);

      // 1秒待機後、次の10件
      await vi.advanceTimersByTimeAsync(1000);
      expect(processedItems.length).toBe(20);

      // 1秒待機後、残り5件
      await vi.advanceTimersByTimeAsync(1000);
      expect(processedItems.length).toBe(25);

      await promise;
    });

    it("バッチサイズをカスタマイズできる", async () => {
      const limiter = new RateLimiter({ batchSize: 5, batchDelayMs: 500 });
      const items = Array.from({ length: 12 }, (_, i) => `item-${String(i + 1)}`);
      const processedItems: string[] = [];

      const processor = (item: string) => {
        processedItems.push(item);
        return Promise.resolve(item);
      };

      const promise = limiter.processInBatches(items, processor);

      // 最初の5件
      await vi.advanceTimersByTimeAsync(0);
      expect(processedItems.length).toBe(5);

      // 500ms後、次の5件
      await vi.advanceTimersByTimeAsync(500);
      expect(processedItems.length).toBe(10);

      // 500ms後、残り2件
      await vi.advanceTimersByTimeAsync(500);
      expect(processedItems.length).toBe(12);

      await promise;
    });

    it("進捗コールバックが呼ばれる", async () => {
      const limiter = new RateLimiter({ batchSize: 5 });
      const items = Array.from({ length: 12 }, (_, i) => `item-${String(i + 1)}`);
      const progressCalls: { current: number; total: number }[] = [];

      const processor = (item: string) => Promise.resolve(item);
      const onProgress = (current: number, total: number) => {
        progressCalls.push({ current, total });
      };

      const promise = limiter.processInBatches(items, processor, { onProgress });

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(progressCalls).toContainEqual({ current: 5, total: 12 });
      expect(progressCalls).toContainEqual({ current: 10, total: 12 });
      expect(progressCalls).toContainEqual({ current: 12, total: 12 });
    });
  });

  describe("429エラー対応", () => {
    it("429エラー時にRetry-Afterヘッダーに従って待機する", async () => {
      const limiter = new RateLimiter();
      const retryAfterSeconds = 5;

      const waitPromise = limiter.handleRateLimitError(retryAfterSeconds);

      // 4秒経過では完了しない
      await vi.advanceTimersByTimeAsync(4000);

      // 5秒経過で完了
      await vi.advanceTimersByTimeAsync(1000);
      await waitPromise;
    });

    it("Retry-Afterがない場合、デフォルト60秒待機する", async () => {
      const limiter = new RateLimiter({ defaultRateLimitWaitMs: 60000 });

      const waitPromise = limiter.handleRateLimitError(undefined);

      // 59秒経過では完了しない
      await vi.advanceTimersByTimeAsync(59000);

      // 60秒経過で完了
      await vi.advanceTimersByTimeAsync(1000);
      await waitPromise;
    });

    it("待機時にonRateLimitコールバックが呼ばれる", async () => {
      const onRateLimit = vi.fn();
      const limiter = new RateLimiter({ onRateLimit });

      const waitPromise = limiter.handleRateLimitError(10);

      expect(onRateLimit).toHaveBeenCalledWith(10);

      await vi.advanceTimersByTimeAsync(10000);
      await waitPromise;
    });
  });

  describe("エッジケース", () => {
    it("空の配列を処理できる", async () => {
      const limiter = new RateLimiter();
      const items: string[] = [];
      const processor = vi.fn().mockResolvedValue("result");

      const results = await limiter.processInBatches(items, processor);

      expect(results).toEqual([]);
      expect(processor).not.toHaveBeenCalled();
    });

    it("バッチサイズより小さい配列を処理できる", async () => {
      const limiter = new RateLimiter({ batchSize: 10 });
      const items = ["a", "b", "c"];
      const processor = (item: string) => Promise.resolve(item.toUpperCase());

      const results = await limiter.processInBatches(items, processor);

      expect(results).toEqual(["A", "B", "C"]);
    });

    it("ちょうどバッチサイズの配列を処理できる", async () => {
      const limiter = new RateLimiter({ batchSize: 10 });
      const items = Array.from({ length: 10 }, (_, i) => String(i));
      const processor = (item: string) => Promise.resolve(item);

      const promise = limiter.processInBatches(items, processor);

      // 即座に全て処理される（待機なし）
      await vi.advanceTimersByTimeAsync(0);
      const results = await promise;

      expect(results).toHaveLength(10);
    });
  });
});
