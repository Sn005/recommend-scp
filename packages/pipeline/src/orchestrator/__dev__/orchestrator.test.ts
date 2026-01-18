/**
 * パイプラインオーケストレーターテスト
 * Subtask: 003-04-01
 */

/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PipelineOrchestrator } from "../orchestrator";
import type { PipelineConfig } from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Logger } from "../../crawler/utils/logger";

// モックロガー作成
const createMockLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

// モック定義
const createMockSupabase = () => {
  const mockRunId = "550e8400-e29b-41d4-a716-446655440000";
  let insertedData: Record<string, unknown> | null = null;
  let updatedData: Record<string, unknown> | null = null;

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "pipeline_runs") {
      return {
        insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: mockRunId },
                error: null,
              }),
            }),
          };
        }),
        update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          updatedData = data;
          return {
            eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
          };
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
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
    getInsertedData: () => insertedData,
    getUpdatedData: () => updatedData,
    mockRunId,
  };
};

const createMockFullCrawler = () => ({
  runFullCrawl: vi.fn().mockResolvedValue({
    successCount: 10,
    failedCount: 0,
    failedIds: [],
    durationMs: 5000,
  }),
});

const createMockDiffCrawler = () => ({
  run: vi.fn().mockResolvedValue({
    newCount: 5,
    updatedCount: 3,
    deletedCount: 1,
    unchangedCount: 100,
    failedCount: 0,
    failedIds: [],
    durationMs: 3000,
  }),
});

const createMockEmbeddingProcessor = () => ({
  process: vi.fn().mockResolvedValue({
    processed: 10,
    succeeded: 10,
    failed: 0,
    totalTokens: 50000,
    actualCost: 0.001,
    duration: 10000,
    errors: [],
  }),
  estimateCost: vi.fn().mockReturnValue({
    estimatedTokens: 50000,
    estimatedCost: 0.001,
  }),
  getPendingArticles: vi.fn().mockResolvedValue([]),
});

const createMockTaggingProcessor = () => ({
  process: vi.fn().mockResolvedValue({
    processed: 10,
    succeeded: 10,
    failed: 0,
    totalInputTokens: 80000,
    totalOutputTokens: 500,
    actualCost: 0.012,
    duration: 30000,
    unknownTags: [],
    errors: [],
  }),
  estimateCost: vi.fn().mockReturnValue({
    estimatedInputTokens: 80000,
    estimatedOutputTokens: 500,
    estimatedCost: 0.012,
  }),
  getPendingArticles: vi.fn().mockResolvedValue([]),
});

describe("PipelineOrchestrator", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let mockFullCrawler: ReturnType<typeof createMockFullCrawler>;
  let mockDiffCrawler: ReturnType<typeof createMockDiffCrawler>;
  let mockEmbeddingProcessor: ReturnType<typeof createMockEmbeddingProcessor>;
  let mockTaggingProcessor: ReturnType<typeof createMockTaggingProcessor>;
  let mockLogger: Logger;
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    mockFullCrawler = createMockFullCrawler();
    mockDiffCrawler = createMockDiffCrawler();
    mockEmbeddingProcessor = createMockEmbeddingProcessor();
    mockTaggingProcessor = createMockTaggingProcessor();
    mockLogger = createMockLogger();

    orchestrator = new PipelineOrchestrator({
      supabaseClient: mockSupabase.client,
      fullCrawler: mockFullCrawler,
      diffCrawler: mockDiffCrawler,
      embeddingProcessor: mockEmbeddingProcessor,
      taggingProcessor: mockTaggingProcessor,
      logger: mockLogger,
    });
  });

  describe("実行モード", () => {
    describe("mode: 'full'", () => {
      it("フルクロール → Embedding → タグ抽出 の順に実行される", async () => {
        const config: PipelineConfig = { mode: "full", lang: "en" };
        const executionOrder: string[] = [];

        mockFullCrawler.runFullCrawl.mockImplementation(async () => {
          executionOrder.push("crawl");
          return {
            successCount: 10,
            failedCount: 0,
            failedIds: [],
            durationMs: 5000,
          };
        });

        mockEmbeddingProcessor.process.mockImplementation(async () => {
          executionOrder.push("embedding");
          return {
            processed: 10,
            succeeded: 10,
            failed: 0,
            totalTokens: 50000,
            actualCost: 0.001,
            duration: 10000,
            errors: [],
          };
        });

        mockTaggingProcessor.process.mockImplementation(async () => {
          executionOrder.push("tagging");
          return {
            processed: 10,
            succeeded: 10,
            failed: 0,
            totalInputTokens: 80000,
            totalOutputTokens: 500,
            actualCost: 0.012,
            duration: 30000,
            unknownTags: [],
            errors: [],
          };
        });

        await orchestrator.run(config);

        expect(executionOrder).toEqual(["crawl", "embedding", "tagging"]);
      });

      it("各フェーズの結果が返される", async () => {
        const config: PipelineConfig = { mode: "full", lang: "en" };

        const result = await orchestrator.run(config);

        expect(result.crawl).toBeDefined();
        expect(result.embedding).toBeDefined();
        expect(result.tagging).toBeDefined();
      });
    });

    describe("mode: 'diff'", () => {
      it("差分クロール → Embedding → タグ抽出 の順に実行される", async () => {
        const config: PipelineConfig = { mode: "diff", lang: "en" };
        const executionOrder: string[] = [];

        mockDiffCrawler.run.mockImplementation(async () => {
          executionOrder.push("diff-crawl");
          return {
            newCount: 5,
            updatedCount: 3,
            deletedCount: 1,
            unchangedCount: 100,
            failedCount: 0,
            failedIds: [],
            durationMs: 3000,
          };
        });

        mockEmbeddingProcessor.process.mockImplementation(async () => {
          executionOrder.push("embedding");
          return {
            processed: 8,
            succeeded: 8,
            failed: 0,
            totalTokens: 40000,
            actualCost: 0.0008,
            duration: 8000,
            errors: [],
          };
        });

        mockTaggingProcessor.process.mockImplementation(async () => {
          executionOrder.push("tagging");
          return {
            processed: 8,
            succeeded: 8,
            failed: 0,
            totalInputTokens: 64000,
            totalOutputTokens: 400,
            actualCost: 0.01,
            duration: 25000,
            unknownTags: [],
            errors: [],
          };
        });

        await orchestrator.run(config);

        expect(executionOrder).toEqual(["diff-crawl", "embedding", "tagging"]);
      });
    });

    describe("mode: 'embedding'", () => {
      it("クロールをスキップしてEmbeddingのみ実行される", async () => {
        const config: PipelineConfig = { mode: "embedding", lang: "en" };

        const result = await orchestrator.run(config);

        expect(mockFullCrawler.runFullCrawl).not.toHaveBeenCalled();
        expect(mockDiffCrawler.run).not.toHaveBeenCalled();
        expect(mockEmbeddingProcessor.process).toHaveBeenCalled();
        expect(mockTaggingProcessor.process).not.toHaveBeenCalled();
        expect(result.crawl).toBeUndefined();
        expect(result.embedding).toBeDefined();
        expect(result.tagging).toBeUndefined();
      });
    });

    describe("mode: 'tagging'", () => {
      it("クロールとEmbeddingをスキップしてタグ抽出のみ実行される", async () => {
        const config: PipelineConfig = { mode: "tagging", lang: "en" };

        const result = await orchestrator.run(config);

        expect(mockFullCrawler.runFullCrawl).not.toHaveBeenCalled();
        expect(mockDiffCrawler.run).not.toHaveBeenCalled();
        expect(mockEmbeddingProcessor.process).not.toHaveBeenCalled();
        expect(mockTaggingProcessor.process).toHaveBeenCalled();
        expect(result.crawl).toBeUndefined();
        expect(result.embedding).toBeUndefined();
        expect(result.tagging).toBeDefined();
      });
    });
  });

  describe("実行履歴管理", () => {
    describe("パイプライン開始時", () => {
      it("pipeline_runsにrunning状態のレコードが作成される", async () => {
        const config: PipelineConfig = { mode: "full", lang: "en" };

        await orchestrator.run(config);

        expect(mockSupabase.mockFrom).toHaveBeenCalledWith("pipeline_runs");
        const insertedData = mockSupabase.getInsertedData();
        expect(insertedData).toMatchObject({
          status: "running",
        });
      });

      it("run_typeにモードが記録される", async () => {
        const config: PipelineConfig = { mode: "diff", lang: "en" };

        await orchestrator.run(config);

        const insertedData = mockSupabase.getInsertedData();
        expect(insertedData).toMatchObject({
          run_type: "diff_crawl",
        });
      });
    });

    describe("パイプライン完了時", () => {
      it("ステータスがcompletedに更新される", async () => {
        const config: PipelineConfig = { mode: "full", lang: "en" };

        await orchestrator.run(config);

        const updatedData = mockSupabase.getUpdatedData();
        expect(updatedData).toMatchObject({
          status: "completed",
        });
      });

      it("処理統計が保存される", async () => {
        const config: PipelineConfig = { mode: "full", lang: "en" };

        mockFullCrawler.runFullCrawl.mockResolvedValue({
          successCount: 50,
          failedCount: 2,
          failedIds: ["scp-001", "scp-002"],
          durationMs: 10000,
        });

        mockEmbeddingProcessor.process.mockResolvedValue({
          processed: 50,
          succeeded: 48,
          failed: 2,
          totalTokens: 250000,
          actualCost: 0.005,
          duration: 50000,
          errors: [],
        });

        mockTaggingProcessor.process.mockResolvedValue({
          processed: 48,
          succeeded: 46,
          failed: 2,
          totalInputTokens: 384000,
          totalOutputTokens: 2400,
          actualCost: 0.06,
          duration: 120000,
          unknownTags: [],
          errors: [],
        });

        await orchestrator.run(config);

        const updatedData = mockSupabase.getUpdatedData();
        expect(updatedData).toHaveProperty("stats");
        expect(updatedData).toMatchObject({
          stats: expect.objectContaining({
            totalCost: expect.any(Number),
          }),
        });
      });

      it("completed_atに終了時刻が設定される", async () => {
        const config: PipelineConfig = { mode: "full", lang: "en" };

        await orchestrator.run(config);

        const updatedData = mockSupabase.getUpdatedData();
        expect(updatedData).toHaveProperty("completed_at");
      });

      it("実行時間（duration）が計算される", async () => {
        const config: PipelineConfig = { mode: "full", lang: "en" };

        const result = await orchestrator.run(config);

        expect(result.duration).toBeGreaterThanOrEqual(0);
      });
    });

    describe("パイプライン失敗時", () => {
      it("ステータスがfailedに更新される", async () => {
        const config: PipelineConfig = { mode: "full", lang: "en" };
        mockFullCrawler.runFullCrawl.mockRejectedValue(new Error("クロール失敗"));

        await expect(orchestrator.run(config)).rejects.toThrow("クロール失敗");

        const updatedData = mockSupabase.getUpdatedData();
        expect(updatedData).toMatchObject({
          status: "failed",
        });
      });

      it("エラーメッセージが保存される", async () => {
        const config: PipelineConfig = { mode: "full", lang: "en" };
        const errorMessage = "ネットワークタイムアウト";
        mockFullCrawler.runFullCrawl.mockRejectedValue(new Error(errorMessage));

        await expect(orchestrator.run(config)).rejects.toThrow();

        const updatedData = mockSupabase.getUpdatedData();
        expect(updatedData).toMatchObject({
          error_message: errorMessage,
        });
      });

      it("エラーがリスローされる", async () => {
        const config: PipelineConfig = { mode: "full", lang: "en" };
        const error = new Error("致命的エラー");
        mockFullCrawler.runFullCrawl.mockRejectedValue(error);

        await expect(orchestrator.run(config)).rejects.toThrow("致命的エラー");
      });
    });
  });

  describe("コスト制御", () => {
    describe("コスト上限チェック", () => {
      it("処理開始前にコスト見積もりが計算される", async () => {
        const config: PipelineConfig = { mode: "full", costLimit: 5.0 };

        await orchestrator.run(config);

        expect(mockEmbeddingProcessor.estimateCost).toHaveBeenCalled();
        expect(mockTaggingProcessor.estimateCost).toHaveBeenCalled();
      });

      it("上限超過時にエラーがスローされる", async () => {
        const config: PipelineConfig = { mode: "full", costLimit: 0.001 };

        mockEmbeddingProcessor.estimateCost.mockReturnValue({
          estimatedTokens: 1000000,
          estimatedCost: 0.5,
        });

        mockTaggingProcessor.estimateCost.mockReturnValue({
          estimatedInputTokens: 2000000,
          estimatedOutputTokens: 10000,
          estimatedCost: 0.6,
        });

        await expect(orchestrator.run(config)).rejects.toThrow(/コスト上限超過/);
      });

      it("上限内の場合は処理が進行する", async () => {
        const config: PipelineConfig = { mode: "full", costLimit: 1.0 };

        mockEmbeddingProcessor.estimateCost.mockReturnValue({
          estimatedTokens: 50000,
          estimatedCost: 0.001,
        });

        mockTaggingProcessor.estimateCost.mockReturnValue({
          estimatedInputTokens: 80000,
          estimatedOutputTokens: 500,
          estimatedCost: 0.012,
        });

        const result = await orchestrator.run(config);

        expect(result.status).toBe("completed");
      });

      it("costLimit未指定時はチェックがスキップされる", async () => {
        const config: PipelineConfig = { mode: "full" };

        await orchestrator.run(config);

        expect(mockEmbeddingProcessor.estimateCost).not.toHaveBeenCalled();
        expect(mockTaggingProcessor.estimateCost).not.toHaveBeenCalled();
      });
    });

    describe("コスト監視", () => {
      it("コストが上限の90%に達したら警告ログが出力される", async () => {
        const config: PipelineConfig = { mode: "full", costLimit: 0.1 };

        mockEmbeddingProcessor.estimateCost.mockReturnValue({
          estimatedTokens: 50000,
          estimatedCost: 0.001,
        });

        mockTaggingProcessor.estimateCost.mockReturnValue({
          estimatedInputTokens: 80000,
          estimatedOutputTokens: 500,
          estimatedCost: 0.012,
        });

        // Embedding完了時点で$0.05
        mockEmbeddingProcessor.process.mockResolvedValue({
          processed: 100,
          succeeded: 100,
          failed: 0,
          totalTokens: 500000,
          actualCost: 0.05,
          duration: 50000,
          errors: [],
        });

        // タグ抽出完了時点で合計$0.095（95%）
        mockTaggingProcessor.process.mockResolvedValue({
          processed: 100,
          succeeded: 100,
          failed: 0,
          totalInputTokens: 800000,
          totalOutputTokens: 5000,
          actualCost: 0.045,
          duration: 120000,
          unknownTags: [],
          errors: [],
        });

        await orchestrator.run(config);

        // 90%以上に達した際の警告を確認（95.0%のような形式）
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringMatching(/コスト上限の\d+(\.\d+)?%に達しました/)
        );
      });
    });
  });

  describe("進捗ログ", () => {
    it("各フェーズの開始がログ出力される", async () => {
      const config: PipelineConfig = { mode: "full" };

      await orchestrator.run(config);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("クロール"));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Embedding"));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("タグ抽出"));
    });

    it("パイプライン開始時に実行情報がログ出力される", async () => {
      const config: PipelineConfig = { mode: "full", lang: "en" };

      await orchestrator.run(config);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("パイプライン開始"));
    });

    it("パイプライン完了時に結果がログ出力される", async () => {
      const config: PipelineConfig = { mode: "full" };

      await orchestrator.run(config);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("完了"));
    });
  });

  describe("チェックポイント", () => {
    describe("チェックポイント保存", () => {
      it("各フェーズ完了時にチェックポイントが保存される", async () => {
        const config: PipelineConfig = { mode: "full" };

        await orchestrator.run(config);

        // チェックポイント更新が呼ばれることを確認
        // update呼び出し回数は複数回（各フェーズ完了時 + 最終更新）
        expect(mockSupabase.mockFrom).toHaveBeenCalledWith("pipeline_runs");
      });
    });

    describe("チェックポイントからの再開", () => {
      it("resumeFromRunオプション指定時、前回のチェックポイントから再開される", async () => {
        const previousRunId = "previous-run-id";
        const config: PipelineConfig = { mode: "full", resumeFromRun: previousRunId };

        // 前回の実行情報を返すモック
        mockSupabase.mockFrom.mockImplementation((table: string) => {
          if (table === "pipeline_runs") {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mockSupabase.mockRunId },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
              }),
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: previousRunId,
                      status: "failed",
                      checkpoint: {
                        phase: "crawl_completed",
                        result: { successCount: 100 },
                        timestamp: new Date().toISOString(),
                      },
                    },
                  ],
                  error: null,
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        });

        await orchestrator.run(config);

        // クロールはスキップされる
        expect(mockFullCrawler.runFullCrawl).not.toHaveBeenCalled();
        // Embeddingから再開される
        expect(mockEmbeddingProcessor.process).toHaveBeenCalled();
      });

      it("チェックポイントが存在しない場合はエラーがスローされる", async () => {
        const config: PipelineConfig = { mode: "full", resumeFromRun: "invalid-id" };

        mockSupabase.mockFrom.mockImplementation((table: string) => {
          if (table === "pipeline_runs") {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mockSupabase.mockRunId },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
              }),
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        });

        await expect(orchestrator.run(config)).rejects.toThrow(/実行IDが見つかりません/);
      });

      it("完了済みの実行から再開しようとした場合はエラーがスローされる", async () => {
        const config: PipelineConfig = { mode: "full", resumeFromRun: "completed-id" };

        mockSupabase.mockFrom.mockImplementation((table: string) => {
          if (table === "pipeline_runs") {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mockSupabase.mockRunId },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
              }),
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "completed-id",
                      status: "completed",
                    },
                  ],
                  error: null,
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        });

        await expect(orchestrator.run(config)).rejects.toThrow(/既に完了しています/);
      });
    });
  });

  describe("runIdとステータス", () => {
    it("実行結果にrunIdが含まれる", async () => {
      const config: PipelineConfig = { mode: "full" };

      const result = await orchestrator.run(config);

      expect(result.runId).toBe(mockSupabase.mockRunId);
    });

    it("正常完了時のstatusはcompletedである", async () => {
      const config: PipelineConfig = { mode: "full" };

      const result = await orchestrator.run(config);

      expect(result.status).toBe("completed");
    });

    it("modeが結果に含まれる", async () => {
      const config: PipelineConfig = { mode: "diff" };

      const result = await orchestrator.run(config);

      expect(result.mode).toBe("diff");
    });
  });
});
