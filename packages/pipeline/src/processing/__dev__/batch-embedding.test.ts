/**
 * BatchEmbeddingProcessor テスト
 * Subtask: 003-03-01
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  BatchEmbeddingProcessor,
  type EmbeddingProgress,
  type DbArticle,
  type ProcessorOptions,
} from "../batch-embedding";

// モック
const mockSupabaseClient = {
  from: vi.fn(),
};

const mockOpenAIClient = {
  embeddings: {
    create: vi.fn(),
  },
};

// テストヘルパー
function createMockArticle(overrides?: {
  id?: string; // 後方互換性のために残す（article_idに使用される）
  article_id?: string;
  content?: string;
  embedding_status?: DbArticle["embedding_status"];
}): DbArticle {
  // id パラメータは article_id として扱う（後方互換性）
  const articleId = overrides?.article_id ?? overrides?.id ?? "SCP-173";
  return {
    id: `uuid-${articleId}`, // UUIDはarticle_idから生成
    article_id: articleId,
    title: "The Sculpture",
    content: overrides?.content ?? "The Sculpture is to be kept in a locked container...",
    content_hash: "hash123",
    rating: 100,
    lang: "en",
    embedding_status: overrides?.embedding_status ?? "pending",
    last_processed_at: null,
    embedding: null,
  };
}

function createMockEmbedding(dimension = 1536): number[] {
  return new Array(dimension).fill(0).map(() => Math.random());
}

// Supabaseモックを設定するヘルパー
function setupSupabaseMock(options: {
  articles?: DbArticle[];
  updateMock?: ReturnType<typeof vi.fn>;
  upsertMock?: ReturnType<typeof vi.fn>;
  selectError?: { message: string } | null;
}) {
  const {
    articles = [createMockArticle()],
    updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    upsertMock = vi.fn().mockResolvedValue({ data: null, error: null }),
    selectError = null,
  } = options;

  mockSupabaseClient.from.mockImplementation((table: string) => {
    if (table === "retry_queue") {
      return { upsert: upsertMock };
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: selectError ? null : articles,
            error: selectError,
          }),
        }),
      }),
      update: updateMock,
      upsert: upsertMock,
    };
  });
}

describe("BatchEmbeddingProcessor", () => {
  let processor: BatchEmbeddingProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockOpenAIClient.embeddings.create.mockResolvedValue({
      data: [{ embedding: createMockEmbedding() }],
      usage: { total_tokens: 100 },
    });

    processor = new BatchEmbeddingProcessor({
      supabaseClient: mockSupabaseClient as unknown as ProcessorOptions["supabaseClient"],
      openaiClient: mockOpenAIClient as unknown as ProcessorOptions["openaiClient"],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("ステータス管理", () => {
    describe("未処理記事取得と処理開始", () => {
      it("pending状態の記事を取得できる", async () => {
        const mockArticles = [
          createMockArticle({ id: "SCP-001" }),
          createMockArticle({ id: "SCP-002" }),
        ];

        setupSupabaseMock({ articles: mockArticles });

        const articles = await processor.getPendingArticles();
        expect(articles).toHaveLength(2);
        expect(articles[0].embedding_status).toBe("pending");
      });

      it("処理開始時にステータスがprocessingに更新される", async () => {
        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

        setupSupabaseMock({ updateMock });

        await processor.process({ dryRun: false });

        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({ embedding_status: "processing" })
        );
      });

      it("processing状態の記事は取得されない", async () => {
        setupSupabaseMock({ articles: [] });

        const articles = await processor.getPendingArticles();
        expect(articles).toHaveLength(0);
      });

      it("pending記事が0件の場合は空配列を返す", async () => {
        setupSupabaseMock({ articles: [] });

        const articles = await processor.getPendingArticles();
        expect(articles).toEqual([]);
      });
    });

    describe("成功時の更新", () => {
      it("成功時にステータスがcompletedに更新される", async () => {
        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

        setupSupabaseMock({ updateMock });

        await processor.process({ dryRun: false });

        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({ embedding_status: "completed" })
        );
      });

      it("last_processed_atに現在時刻が設定される", async () => {
        const now = new Date("2025-01-15T10:00:00Z");
        vi.setSystemTime(now);

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

        setupSupabaseMock({ updateMock });

        await processor.process({ dryRun: false });

        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            last_processed_at: now.toISOString(),
          })
        );
      });

      it("embeddingベクトルがDBに保存される", async () => {
        const mockEmbedding = createMockEmbedding();
        mockOpenAIClient.embeddings.create.mockResolvedValue({
          data: [{ embedding: mockEmbedding }],
          usage: { total_tokens: 100 },
        });

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

        setupSupabaseMock({ updateMock });

        await processor.process({ dryRun: false });

        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            embedding: mockEmbedding,
          })
        );
      });

      it("embedding次元数が1536である", async () => {
        const mockEmbedding = createMockEmbedding(1536);
        mockOpenAIClient.embeddings.create.mockResolvedValue({
          data: [{ embedding: mockEmbedding }],
          usage: { total_tokens: 100 },
        });

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

        setupSupabaseMock({ updateMock });

        await processor.process({ dryRun: false });

        const updateCalls = updateMock.mock.calls as [Partial<DbArticle>][];
        const updateCall = updateCalls.find((call) => call[0].embedding !== undefined);
        expect(updateCall?.[0].embedding).toHaveLength(1536);
      });
    });

    describe("失敗時の更新", () => {
      it("3回リトライ後も失敗した場合、ステータスがerrorに更新される", async () => {
        mockOpenAIClient.embeddings.create.mockRejectedValue(new Error("API Error"));

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });
        const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

        setupSupabaseMock({ updateMock, upsertMock });

        // テスト実行と同時にタイマーを進める
        const processPromise = processor.process({ dryRun: false });
        await vi.runAllTimersAsync();
        await processPromise;

        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({ embedding_status: "error" })
        );
      });

      it("リトライキューにレコードが追加される", async () => {
        mockOpenAIClient.embeddings.create.mockRejectedValue(new Error("API Error"));

        const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

        setupSupabaseMock({ upsertMock });

        const processPromise = processor.process({ dryRun: false });
        await vi.runAllTimersAsync();
        await processPromise;

        expect(upsertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            article_id: "SCP-173",
            operation: "embedding",
          }),
          expect.any(Object)
        );
      });

      it("リトライキューにエラーメッセージが記録される", async () => {
        const errorMessage = "Rate limit exceeded";
        mockOpenAIClient.embeddings.create.mockRejectedValue(new Error(errorMessage));

        const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

        setupSupabaseMock({ upsertMock });

        const processPromise = processor.process({ dryRun: false });
        await vi.runAllTimersAsync();
        await processPromise;

        expect(upsertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            last_error: errorMessage,
          }),
          expect.any(Object)
        );
      });

      it("1回目で成功した場合リトライキューに追加されない", async () => {
        const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

        setupSupabaseMock({ upsertMock });

        await processor.process({ dryRun: false });

        expect(upsertMock).not.toHaveBeenCalled();
      });
    });
  });

  describe("コスト見積もり", () => {
    describe("処理前の見積もり", () => {
      it("予想トークン数が正しく計算される", () => {
        const content = "A".repeat(400); // 400文字 ≈ 100トークン
        const estimate = processor.estimateCost([createMockArticle({ content })]);

        expect(estimate.estimatedTokens).toBe(100);
      });

      it("予想コストが正しく計算される", () => {
        // MAX_CONTENT_LENGTH = 30000 なので、これを使って計算
        // 30,000文字 / 4 = 7,500トークン
        // 100万トークンで$0.02なので、7500トークンは $0.00015
        const content = "A".repeat(30000);
        const estimate = processor.estimateCost([createMockArticle({ content })]);

        expect(estimate.estimatedCost).toBeCloseTo(0.00015, 5);
      });

      it("コスト上限超過時にエラーがスローされる", async () => {
        // 多数の記事を用意してコストを上げる
        // 100記事 * 30000文字 = 750,000トークン = $0.015
        const articles = Array.from({ length: 100 }, (_, i) =>
          createMockArticle({
            id: `SCP-${i.toString().padStart(3, "0")}`,
            content: "A".repeat(30000),
          })
        );

        setupSupabaseMock({ articles });

        await expect(processor.process({ costLimit: 0.01, dryRun: false })).rejects.toThrow(
          "コスト上限超過"
        );
      });

      it("コスト上限内の場合は正常に進行する", async () => {
        const content = "A".repeat(400); // 約$0.000002

        setupSupabaseMock({ articles: [createMockArticle({ content })] });

        const result = await processor.process({ costLimit: 1.0, dryRun: false });
        expect(result.succeeded).toBe(1);
      });

      it("記事が0件の場合はトークン数0、コスト0", () => {
        const estimate = processor.estimateCost([]);
        expect(estimate.estimatedTokens).toBe(0);
        expect(estimate.estimatedCost).toBe(0);
      });
    });

    describe("処理後の実績出力", () => {
      it("実際のトークン数が記録される", async () => {
        mockOpenAIClient.embeddings.create.mockResolvedValue({
          data: [{ embedding: createMockEmbedding() }],
          usage: { total_tokens: 150 },
        });

        setupSupabaseMock({});

        const result = await processor.process({ dryRun: false });
        expect(result.totalTokens).toBe(150);
      });

      it("実コストが正しく計算される", async () => {
        mockOpenAIClient.embeddings.create.mockResolvedValue({
          data: [{ embedding: createMockEmbedding() }],
          usage: { total_tokens: 1_000_000 },
        });

        setupSupabaseMock({});

        const result = await processor.process({ dryRun: false });
        expect(result.actualCost).toBeCloseTo(0.02, 3);
      });
    });
  });

  describe("バッチ処理最適化", () => {
    describe("並列処理とレート制限", () => {
      it("バッチサイズ10件で処理される", async () => {
        const articles = Array.from({ length: 25 }, (_, i) =>
          createMockArticle({ id: `SCP-${i.toString().padStart(3, "0")}` })
        );

        setupSupabaseMock({ articles });

        // バッチ処理を実行しながらタイマーを進める
        const processPromise = processor.process({ batchSize: 10, dryRun: false });
        await vi.runAllTimersAsync();
        const result = await processPromise;

        expect(result.succeeded).toBe(25);
      });

      it("バッチ間に1秒の遅延が挿入される", async () => {
        const articles = Array.from({ length: 15 }, (_, i) =>
          createMockArticle({ id: `SCP-${i.toString().padStart(3, "0")}` })
        );

        setupSupabaseMock({ articles });

        const sleepSpy = vi.spyOn(global, "setTimeout");

        const processPromise = processor.process({ batchSize: 10, dryRun: false });
        await vi.runAllTimersAsync();
        await processPromise;

        // 2バッチ目との間に1秒遅延
        const delayCall = sleepSpy.mock.calls.find((call) => call[1] === 1000);
        expect(delayCall).toBeDefined();
      });

      it("レート制限時にエクスポネンシャルバックオフで待機する", async () => {
        let callCount = 0;
        mockOpenAIClient.embeddings.create.mockImplementation(() => {
          callCount++;
          if (callCount <= 2) {
            const error = new Error("Rate limit exceeded") as Error & { status: number };
            error.status = 429;
            return Promise.reject(error);
          }
          return Promise.resolve({
            data: [{ embedding: createMockEmbedding() }],
            usage: { total_tokens: 100 },
          });
        });

        setupSupabaseMock({});

        const processPromise = processor.process({ dryRun: false });
        await vi.runAllTimersAsync();
        const result = await processPromise;

        expect(result.succeeded).toBe(1);
        expect(callCount).toBe(3); // 2回失敗 + 1回成功
      });
    });

    describe("進捗表示", () => {
      it("処理済み件数と全件数が表示される", async () => {
        const articles = Array.from({ length: 5 }, (_, i) =>
          createMockArticle({ id: `SCP-${i.toString().padStart(3, "0")}` })
        );

        setupSupabaseMock({ articles });

        const progressUpdates: EmbeddingProgress[] = [];
        const onProgress = vi.fn((progress: EmbeddingProgress) => {
          progressUpdates.push({ ...progress });
        });

        await processor.process({ onProgress, dryRun: false });

        expect(onProgress).toHaveBeenCalled();
        expect(progressUpdates[progressUpdates.length - 1].processed).toBe(5);
        expect(progressUpdates[progressUpdates.length - 1].total).toBe(5);
      });

      it("推定残り時間が計算される", async () => {
        const articles = Array.from({ length: 10 }, (_, i) =>
          createMockArticle({ id: `SCP-${i.toString().padStart(3, "0")}` })
        );

        setupSupabaseMock({ articles });

        const progressUpdates: EmbeddingProgress[] = [];
        const onProgress = vi.fn((progress: EmbeddingProgress) => {
          progressUpdates.push({ ...progress });
        });

        await processor.process({ onProgress, dryRun: false });

        // 中間の進捗で残り時間が設定されているか
        const midProgress = progressUpdates.find((p) => p.processed > 0 && p.processed < 10);
        expect(midProgress?.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
      });

      it("成功件数と失敗件数が個別に表示される", async () => {
        // 2番目の記事（SCP-001）は常に失敗するように設定（リトライしても失敗）
        mockOpenAIClient.embeddings.create.mockImplementation((params: { input: string }) => {
          // input に "FAIL_MARKER" が含まれている場合は常に失敗
          if (params.input.includes("FAIL_MARKER")) {
            return Promise.reject(new Error("API Error"));
          }
          return Promise.resolve({
            data: [{ embedding: createMockEmbedding() }],
            usage: { total_tokens: 100 },
          });
        });

        const articles = [
          createMockArticle({ id: "SCP-000", content: "Success content 0" }),
          createMockArticle({ id: "SCP-001", content: "FAIL_MARKER content 1" }),
          createMockArticle({ id: "SCP-002", content: "Success content 2" }),
        ];

        setupSupabaseMock({ articles });

        const progressUpdates: EmbeddingProgress[] = [];
        const onProgress = vi.fn((progress: EmbeddingProgress) => {
          progressUpdates.push({ ...progress });
        });

        // リトライでタイマーが使われるので進める
        const processPromise = processor.process({ onProgress, dryRun: false });
        await vi.runAllTimersAsync();
        await processPromise;

        const finalProgress = progressUpdates[progressUpdates.length - 1];
        expect(finalProgress.succeeded).toBe(2);
        expect(finalProgress.failed).toBe(1);
      });
    });
  });

  describe("ドライラン", () => {
    it("dryRun時にAPI呼び出しが行われない", async () => {
      setupSupabaseMock({});

      await processor.process({ dryRun: true });

      expect(mockOpenAIClient.embeddings.create).not.toHaveBeenCalled();
    });

    it("dryRun時に推定トークン数が計算される", async () => {
      const content = "A".repeat(400); // 400文字 ≈ 100トークン
      setupSupabaseMock({ articles: [createMockArticle({ content })] });

      const result = await processor.process({ dryRun: true });
      expect(result.totalTokens).toBe(100);
    });

    it("dryRun時に推定コストが計算される", async () => {
      // 30,000文字 / 4 = 7,500トークン = $0.00015
      const content = "A".repeat(30000);
      setupSupabaseMock({ articles: [createMockArticle({ content })] });

      const result = await processor.process({ dryRun: true });
      expect(result.actualCost).toBeCloseTo(0.00015, 5);
    });

    it("dryRun時にDBへの書き込みが行われない", async () => {
      const updateMock = vi.fn();
      setupSupabaseMock({ updateMock });

      await processor.process({ dryRun: true });

      expect(updateMock).not.toHaveBeenCalled();
    });

    it("dryRun時でも進捗表示は動作する", async () => {
      setupSupabaseMock({});

      const onProgress = vi.fn();
      await processor.process({ dryRun: true, onProgress });

      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe("エッジケース", () => {
    describe("入力値", () => {
      it("記事コンテンツが空文字列の場合も処理できる", async () => {
        setupSupabaseMock({ articles: [createMockArticle({ content: "" })] });

        const result = await processor.process({ dryRun: false });
        expect(result.processed).toBe(1);
      });

      it("MAX_CONTENT_LENGTH超過時はトランケートされる", () => {
        const longContent = "A".repeat(50000); // 30000を超える
        const estimate = processor.estimateCost([createMockArticle({ content: longContent })]);

        // 30000文字 / 4 = 7500トークン
        expect(estimate.estimatedTokens).toBe(7500);
      });
    });

    describe("外部依存", () => {
      it("DB接続エラー時は適切なエラーがスローされる", async () => {
        setupSupabaseMock({ selectError: { message: "Connection refused" } });

        await expect(processor.getPendingArticles()).rejects.toThrow(
          "未処理記事の取得に失敗しました: Connection refused"
        );
      });

      it("API接続失敗時は適切にエラーハンドリングされる", async () => {
        mockOpenAIClient.embeddings.create.mockRejectedValue(new Error("Network error"));

        setupSupabaseMock({});

        const processPromise = processor.process({ dryRun: false });
        await vi.runAllTimersAsync();
        const result = await processPromise;

        expect(result.failed).toBe(1);
        expect(result.errors[0].error).toBe("Network error");
      });
    });
  });
});
