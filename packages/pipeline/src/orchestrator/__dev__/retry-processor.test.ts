/**
 * リトライプロセッサテスト
 * Subtask: 003-04-03
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RetryProcessor } from "../retry-processor";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Logger } from "../../crawler/utils/logger";

// モックロガー作成
const createMockLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

// リトライキューレコード型
interface RetryQueueRecord {
  id: number;
  article_id: string;
  task_type: "embedding" | "tagging";
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  next_retry_at: string;
  created_at: string;
}

// モックSupabase作成
const createMockSupabase = () => {
  let retryQueueData: RetryQueueRecord[] = [];
  let deletedIds: number[] = [];
  let updatedRecords: { id: number; data: Partial<RetryQueueRecord> }[] = [];

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "retry_queue") {
      return {
        select: vi.fn().mockImplementation(() => ({
          lte: vi.fn().mockImplementation(() => ({
            order: vi.fn().mockImplementation(() =>
              Promise.resolve({
                data: retryQueueData.filter((r) => new Date(r.next_retry_at) <= new Date()),
                error: null,
              })
            ),
          })),
        })),
        delete: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation((_, id: number) => {
            deletedIds.push(id);
            retryQueueData = retryQueueData.filter((r) => r.id !== id);
            return Promise.resolve({ data: {}, error: null });
          }),
        })),
        update: vi.fn().mockImplementation((data: Partial<RetryQueueRecord>) => ({
          eq: vi.fn().mockImplementation((_, id: number) => {
            updatedRecords.push({ id, data });
            const idx = retryQueueData.findIndex((r) => r.id === id);
            if (idx >= 0) {
              retryQueueData[idx] = { ...retryQueueData[idx], ...data };
            }
            return Promise.resolve({ data: {}, error: null });
          }),
        })),
      };
    }
    if (table === "scp_articles") {
      return {
        update: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
        })),
      };
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  });

  return {
    client: { from: mockFrom } as unknown as SupabaseClient,
    mockFrom,
    setRetryQueue: (data: RetryQueueRecord[]) => {
      retryQueueData = [...data];
    },
    getRetryQueue: () => retryQueueData,
    getDeletedIds: () => deletedIds,
    getUpdatedRecords: () => updatedRecords,
    reset: () => {
      retryQueueData = [];
      deletedIds = [];
      updatedRecords = [];
    },
  };
};

// モックプロセッサ作成
const createMockEmbeddingProcessor = () => ({
  processArticle: vi.fn().mockResolvedValue({ success: true }),
});

const createMockTaggingProcessor = () => ({
  processArticle: vi.fn().mockResolvedValue({ success: true }),
});

describe("RetryProcessor", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let mockEmbeddingProcessor: ReturnType<typeof createMockEmbeddingProcessor>;
  let mockTaggingProcessor: ReturnType<typeof createMockTaggingProcessor>;
  let mockLogger: Logger;
  let processor: RetryProcessor;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-19T00:00:00Z"));

    mockSupabase = createMockSupabase();
    mockEmbeddingProcessor = createMockEmbeddingProcessor();
    mockTaggingProcessor = createMockTaggingProcessor();
    mockLogger = createMockLogger();

    processor = new RetryProcessor({
      supabaseClient: mockSupabase.client,
      embeddingProcessor: mockEmbeddingProcessor,
      taggingProcessor: mockTaggingProcessor,
      logger: mockLogger,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    mockSupabase.reset();
  });

  describe("リトライキュー処理", () => {
    it("next_retry_at が現在時刻以前の記事を取得する", async () => {
      // Arrange: 1件が対象、1件が未来のためスキップ
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z", // 過去
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);

      // Act
      const result = await processor.processRetryQueue();

      // Assert
      expect(result.processed).toBe(1);
    });

    it("embeddingタスクを正しく再実行する", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);

      await processor.processRetryQueue();

      expect(mockEmbeddingProcessor.processArticle).toHaveBeenCalledWith("scp-001");
    });

    it("taggingタスクを正しく再実行する", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-002",
          task_type: "tagging",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);

      await processor.processRetryQueue();

      expect(mockTaggingProcessor.processArticle).toHaveBeenCalledWith("scp-002");
    });

    it("リトライキューが空の場合はprocessed: 0を返す", async () => {
      mockSupabase.setRetryQueue([]);

      const result = await processor.processRetryQueue();

      expect(result.processed).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.exhausted).toBe(0);
    });
  });

  describe("リトライ成功時", () => {
    it("リトライキューからレコードを削除する", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);

      await processor.processRetryQueue();

      expect(mockSupabase.getDeletedIds()).toContain(1);
    });

    it("succeededカウントがインクリメントされる", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
        {
          id: 2,
          article_id: "scp-002",
          task_type: "tagging",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);

      const result = await processor.processRetryQueue();

      expect(result.succeeded).toBe(2);
    });
  });

  describe("リトライ失敗時", () => {
    it("retry_countをインクリメントする", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);
      mockEmbeddingProcessor.processArticle.mockRejectedValue(new Error("API timeout"));

      await processor.processRetryQueue();

      const updated = mockSupabase.getUpdatedRecords();
      expect(updated).toHaveLength(1);
      expect(updated[0].data.retry_count).toBe(1);
    });

    it("next_retry_atをエクスポネンシャルバックオフで更新する（1回目: 1時間後）", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);
      mockEmbeddingProcessor.processArticle.mockRejectedValue(new Error("Rate limit"));

      await processor.processRetryQueue();

      const updated = mockSupabase.getUpdatedRecords();
      const nextRetryAt = new Date(updated[0].data.next_retry_at as string);
      const expected = new Date("2025-01-19T01:00:00Z"); // 1時間後
      expect(nextRetryAt.getTime()).toBe(expected.getTime());
    });

    it("last_errorにエラーメッセージを保存する", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);
      const errorMessage = "OpenAI API rate limit exceeded";
      mockEmbeddingProcessor.processArticle.mockRejectedValue(new Error(errorMessage));

      await processor.processRetryQueue();

      const updated = mockSupabase.getUpdatedRecords();
      expect(updated[0].data.last_error).toBe(errorMessage);
    });

    it("failedカウントがインクリメントされる", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);
      mockEmbeddingProcessor.processArticle.mockRejectedValue(new Error("API error"));

      const result = await processor.processRetryQueue();

      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(0);
    });
  });

  describe("最大リトライ回数到達時", () => {
    it("retry_count >= max_retriesの場合、キューから削除する", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 2,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);
      mockEmbeddingProcessor.processArticle.mockRejectedValue(new Error("Permanent failure"));

      await processor.processRetryQueue();

      // 削除されていることを確認
      expect(mockSupabase.getDeletedIds()).toContain(1);
    });

    it("永続エラーをログ出力する", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 2,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);
      mockEmbeddingProcessor.processArticle.mockRejectedValue(new Error("Permanent failure"));

      await processor.processRetryQueue();

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("最大リトライ到達"));
    });

    it("exhaustedカウントがインクリメントされる", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 2,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);
      mockEmbeddingProcessor.processArticle.mockRejectedValue(new Error("Permanent failure"));

      const result = await processor.processRetryQueue();

      expect(result.exhausted).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  describe("エクスポネンシャルバックオフ", () => {
    it("1回目失敗時、1時間後にリトライをスケジュールする", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);
      mockEmbeddingProcessor.processArticle.mockRejectedValue(new Error("API error"));

      await processor.processRetryQueue();

      const updated = mockSupabase.getUpdatedRecords();
      const nextRetryAt = new Date(updated[0].data.next_retry_at as string);
      const expected = new Date("2025-01-19T01:00:00Z"); // 1時間後
      expect(nextRetryAt.getTime()).toBe(expected.getTime());
    });

    it("2回目失敗時、4時間後にリトライをスケジュールする", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 1,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);
      mockEmbeddingProcessor.processArticle.mockRejectedValue(new Error("API error"));

      await processor.processRetryQueue();

      const updated = mockSupabase.getUpdatedRecords();
      const nextRetryAt = new Date(updated[0].data.next_retry_at as string);
      const expected = new Date("2025-01-19T04:00:00Z"); // 4時間後
      expect(nextRetryAt.getTime()).toBe(expected.getTime());
    });

    it("バックオフ計算式が正しい: 1h * 4^(retry_count)", () => {
      // 1回目失敗 (retry_count: 0 -> 1): 1h * 4^0 = 1h
      expect(processor.calculateNextRetryDelay(0)).toBe(1 * 60 * 60 * 1000);
      // 2回目失敗 (retry_count: 1 -> 2): 1h * 4^1 = 4h
      expect(processor.calculateNextRetryDelay(1)).toBe(4 * 60 * 60 * 1000);
      // 3回目失敗 (retry_count: 2 -> 3): 1h * 4^2 = 16h
      expect(processor.calculateNextRetryDelay(2)).toBe(16 * 60 * 60 * 1000);
    });
  });

  describe("リトライレポート", () => {
    it("リトライ処理完了時にレポートを出力する", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);

      const result = await processor.processRetryQueue();
      processor.printReport(result);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("リトライ結果"));
    });

    it("成功/失敗/最大リトライ到達の件数を表示する", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
        {
          id: 2,
          article_id: "scp-002",
          task_type: "tagging",
          retry_count: 0,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
        {
          id: 3,
          article_id: "scp-003",
          task_type: "embedding",
          retry_count: 2,
          max_retries: 3,
          last_error: null,
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);
      mockTaggingProcessor.processArticle.mockRejectedValue(new Error("API error"));
      mockEmbeddingProcessor.processArticle
        .mockResolvedValueOnce({ success: true }) // scp-001 成功
        .mockRejectedValueOnce(new Error("Permanent error")); // scp-003 最大到達

      const result = await processor.processRetryQueue();
      processor.printReport(result);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("処理: 3件"));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("成功: 1件"));
    });

    it("処理対象がない場合もレポートを出力する", async () => {
      mockSupabase.setRetryQueue([]);

      const result = await processor.processRetryQueue();
      processor.printReport(result);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("処理: 0件"));
    });

    it("最大リトライ到達した記事リストを表示する", async () => {
      mockSupabase.setRetryQueue([
        {
          id: 1,
          article_id: "scp-001",
          task_type: "embedding",
          retry_count: 2,
          max_retries: 3,
          last_error: "Rate limit exceeded",
          next_retry_at: "2025-01-18T23:00:00Z",
          created_at: "2025-01-18T00:00:00Z",
        },
      ]);
      mockEmbeddingProcessor.processArticle.mockRejectedValue(new Error("Rate limit exceeded"));

      const result = await processor.processRetryQueue();
      processor.printReport(result);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("最大リトライ到達した記事")
      );
    });
  });
});
