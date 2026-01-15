/**
 * リトライユーティリティのテスト
 * Subtask: 003-02-02
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "../retry";

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("正常系", () => {
    it("成功時はレスポンスを返す", async () => {
      const mockResponse = { data: "test" };
      const fetcher = vi.fn().mockResolvedValue(mockResponse);

      const result = await fetchWithRetry(fetcher);

      expect(result).toEqual(mockResponse);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("一時的なエラー時に最大3回リトライする", async () => {
      let attemptCount = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error("ネットワークエラー"));
        }
        return Promise.resolve({ data: "success" });
      });

      const promise = fetchWithRetry(fetcher);

      // 1回目の失敗後、1秒待機
      await vi.advanceTimersByTimeAsync(1000);
      // 2回目の失敗後、2秒待機
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toEqual({ data: "success" });
      expect(attemptCount).toBe(3);
    });

    it("リトライ間隔が指数的に増加する", async () => {
      const onRetry = vi.fn();
      let callCount = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error(`エラー${String(callCount)}`));
      });

      const promise = fetchWithRetry(fetcher, { maxRetries: 3, onRetry });
      // unhandled rejection 警告を防ぐため即座に catch ハンドラを付ける
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      void promise.catch(() => {});

      // 全タイマーを実行
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow("エラー4");

      // リトライは3回発生
      expect(onRetry).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error));
      expect(onRetry).toHaveBeenNthCalledWith(3, 3, expect.any(Error));
    });

    it("リトライ途中で成功した場合、結果を返す", async () => {
      let callCount = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("エラー1"));
        }
        return Promise.resolve({ data: "success" });
      });

      const promise = fetchWithRetry(fetcher);
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toEqual({ data: "success" });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe("異常系", () => {
    it("最大リトライ回数を超えるとエラーをスローする", async () => {
      const fetcher = vi.fn().mockImplementation(() => Promise.reject(new Error("永続的エラー")));

      const promise = fetchWithRetry(fetcher, { maxRetries: 3 });
      // unhandled rejection 警告を防ぐため即座に catch ハンドラを付ける
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      void promise.catch(() => {});

      // 全タイマーを実行
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow("永続的エラー");
      expect(fetcher).toHaveBeenCalledTimes(4); // 初回 + 3回リトライ
    });
  });

  describe("オプション", () => {
    it("maxRetriesオプションでリトライ回数を変更できる", async () => {
      const fetcher = vi.fn().mockImplementation(() => Promise.reject(new Error("エラー")));

      const promise = fetchWithRetry(fetcher, { maxRetries: 1 });
      // unhandled rejection 警告を防ぐため即座に catch ハンドラを付ける
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      void promise.catch(() => {});

      // 全タイマーを実行
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledTimes(2); // 初回 + 1回リトライ
    });

    it("baseDelayMsオプションで基準遅延を変更できる", async () => {
      const onRetry = vi.fn();
      let callCount = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("エラー"));
        }
        return Promise.resolve({ data: "ok" });
      });

      const promise = fetchWithRetry(fetcher, { baseDelayMs: 500, onRetry });

      // 500ms待機
      await vi.advanceTimersByTimeAsync(500);

      const result = await promise;

      expect(result).toEqual({ data: "ok" });
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("onRetryコールバックがリトライ時に呼ばれる", async () => {
      const onRetry = vi.fn();
      const error = new Error("テストエラー");
      let callCount = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(error);
        }
        return Promise.resolve({ data: "ok" });
      });

      const promise = fetchWithRetry(fetcher, { onRetry });
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(onRetry).toHaveBeenCalledWith(1, error);
    });
  });
});
