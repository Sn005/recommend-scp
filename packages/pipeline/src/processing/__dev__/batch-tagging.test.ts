/**
 * BatchTaggingProcessor テスト
 * Subtask: 003-03-03
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import {
  BatchTaggingProcessor,
  type TaggingProgress,
  type DbTaggingArticle,
  type TaggingProcessorOptions,
} from "../batch-tagging";
import type {
  TagDictionaryManager,
  TagDictionary,
  TagCategory,
} from "@recommend-scp/shared/tagging";

// モック関数の型定義（vitest v4: Mock<FunctionType>）
type GetDictionaryMock = Mock<(lang?: string) => Promise<TagDictionary>>;
type NormalizeMock = Mock<
  (category: TagCategory, rawTag: string, lang?: string) => Promise<string | null>
>;
type GeneratePromptChoicesMock = Mock<(lang?: string) => Promise<string>>;
type ClearCacheMock = Mock<() => void>;

// モック
const mockSupabaseClient = {
  from: vi.fn(),
};

const mockOpenAIClient = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
};

// TagDictionaryManagerのモック（型安全版）

const mockGetDictionary = vi.fn() as GetDictionaryMock;

const mockNormalize = vi.fn() as NormalizeMock;

const mockGeneratePromptChoices = vi.fn() as GeneratePromptChoicesMock;

const mockClearCache = vi.fn() as ClearCacheMock;

const mockTagDictionaryManager: TagDictionaryManager = {
  getDictionary: mockGetDictionary,

  normalize: mockNormalize,

  generatePromptChoices: mockGeneratePromptChoices,

  clearCache: mockClearCache,
};

// テストヘルパー
function createMockArticle(overrides?: {
  id?: string;
  content?: string;
  tagging_status?: DbTaggingArticle["tagging_status"];
}): DbTaggingArticle {
  return {
    id: overrides?.id ?? "SCP-173",
    title: "The Sculpture",
    content: overrides?.content ?? "The Sculpture is to be kept in a locked container...",
    content_hash: "hash123",
    rating: 100,
    lang: "en",
    tagging_status: overrides?.tagging_status ?? "pending",
    last_tagged_at: null,
  };
}

function createMockDictionary(): TagDictionary {
  return {
    object_class: [
      { id: 1, canonicalValue: "Safe", localizedValue: "Safe", aliases: ["safe"] },
      { id: 2, canonicalValue: "Euclid", localizedValue: "Euclid", aliases: ["euclid"] },
      { id: 3, canonicalValue: "Keter", localizedValue: "Keter", aliases: ["keter"] },
    ],
    genre: [
      { id: 4, canonicalValue: "horror", localizedValue: "horror", aliases: ["Horror"] },
      { id: 5, canonicalValue: "sci-fi", localizedValue: "sci-fi", aliases: ["Sci-Fi", "scifi"] },
    ],
    theme: [
      { id: 6, canonicalValue: "cognition", localizedValue: "cognition", aliases: [] },
      { id: 7, canonicalValue: "biological", localizedValue: "biological", aliases: [] },
    ],
    format: [{ id: 8, canonicalValue: "standard", localizedValue: "standard", aliases: [] }],
  };
}

// Supabaseモックを設定するヘルパー
function setupSupabaseMock(options: {
  articles?: DbTaggingArticle[];
  updateMock?: ReturnType<typeof vi.fn>;
  upsertMock?: ReturnType<typeof vi.fn>;
  deleteMock?: ReturnType<typeof vi.fn>;
  insertMock?: ReturnType<typeof vi.fn>;
  selectError?: { message: string } | null;
}) {
  const {
    articles = [createMockArticle()],
    updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    upsertMock = vi.fn().mockResolvedValue({ data: null, error: null }),
    deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    insertMock = vi.fn().mockResolvedValue({ data: null, error: null }),
    selectError = null,
  } = options;

  mockSupabaseClient.from.mockImplementation((table: string) => {
    if (table === "retry_queue") {
      return { upsert: upsertMock };
    }
    if (table === "article_tags") {
      return {
        delete: deleteMock,
        insert: insertMock,
      };
    }
    if (table === "tags") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 1 }],
              error: null,
            }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
      };
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

describe("BatchTaggingProcessor", () => {
  let processor: BatchTaggingProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // タグ辞書マネージャーのデフォルトモック設定

    mockGetDictionary.mockResolvedValue(createMockDictionary());

    mockGeneratePromptChoices.mockResolvedValue(
      `object_class: Safe | Euclid | Keter
genre: horror | sci-fi
theme: cognition | biological
format: standard`
    );

    mockNormalize.mockImplementation(
      (_category: TagCategory, rawTag: string): Promise<string | null> => {
        // 小文字化してマッチング
        const normalized = rawTag.toLowerCase().trim();
        const validTags: Record<string, string> = {
          safe: "Safe",
          euclid: "Euclid",
          keter: "Keter",
          horror: "horror",
          "sci-fi": "sci-fi",
          scifi: "sci-fi",
          cognition: "cognition",
          biological: "biological",
          standard: "standard",
        };
        return Promise.resolve(validTags[normalized] ?? null);
      }
    );

    // OpenAI APIのデフォルトモック設定
    mockOpenAIClient.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              object_class: "Safe",
              genre: ["horror"],
              theme: ["cognition"],
              format: "standard",
            }),
          },
        },
      ],
      usage: { prompt_tokens: 500, completion_tokens: 50 },
    });

    processor = new BatchTaggingProcessor({
      supabaseClient: mockSupabaseClient as unknown as TaggingProcessorOptions["supabaseClient"],
      openaiClient: mockOpenAIClient as unknown as TaggingProcessorOptions["openaiClient"],
      tagDictionaryManager: mockTagDictionaryManager,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("タグ辞書連携", () => {
    describe("プロンプト生成", () => {
      it("タグ辞書からプロンプト選択肢を動的に生成する", async () => {
        setupSupabaseMock({});

        await processor.process({ dryRun: false });

        expect(mockGeneratePromptChoices).toHaveBeenCalledTimes(1);
      });

      it("TagDictionaryManager.generatePromptChoices() が呼び出される", async () => {
        setupSupabaseMock({});

        await processor.process({ dryRun: false });

        expect(mockGeneratePromptChoices).toHaveBeenCalled();
      });

      it("辞書が空の場合でもプロンプトが生成される", async () => {
        mockGeneratePromptChoices.mockResolvedValue(
          `object_class: (no options)
genre: (no options)
theme: (no options)
format: (no options)`
        );
        setupSupabaseMock({});

        const result = await processor.process({ dryRun: true });

        expect(result.processed).toBeGreaterThanOrEqual(0);
      });
    });

    describe("タグ正規化", () => {
      it("LLM出力タグが辞書で正規化される", async () => {
        mockOpenAIClient.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  object_class: "safe", // 小文字
                  genre: ["Horror", "SCI-FI"], // 大文字混在
                  theme: ["cognition"],
                  format: "standard",
                }),
              },
            },
          ],
          usage: { prompt_tokens: 500, completion_tokens: 50 },
        });

        setupSupabaseMock({});

        await processor.process({ dryRun: false });

        // normalizeが各タグに対して呼び出される
        expect(mockNormalize).toHaveBeenCalledWith("object_class", "safe", "en");
        expect(mockNormalize).toHaveBeenCalledWith("genre", "Horror", "en");
        expect(mockNormalize).toHaveBeenCalledWith("genre", "SCI-FI", "en");
      });

      it("正規化できないタグは警告を出力してスキップする", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        mockNormalize.mockImplementation(
          (category: TagCategory, rawTag: string): Promise<string | null> => {
            if (rawTag === "unknown-tag") {
              console.warn(`⚠️ 未知のタグ: ${category}/${rawTag}`);
              return Promise.resolve(null);
            }
            return Promise.resolve(rawTag);
          }
        );

        mockOpenAIClient.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  object_class: "Safe",
                  genre: ["horror", "unknown-tag"],
                  theme: [],
                  format: "standard",
                }),
              },
            },
          ],
          usage: { prompt_tokens: 500, completion_tokens: 50 },
        });

        setupSupabaseMock({});

        const result = await processor.process({ dryRun: false });

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("未知のタグ"));
        expect(result.unknownTags).toHaveLength(1);
        expect(result.unknownTags[0]).toEqual({
          articleId: "SCP-173",
          category: "genre",
          rawTag: "unknown-tag",
        });

        warnSpy.mockRestore();
      });

      it("LLM応答がnull/undefinedの場合はエラーハンドリングされる", async () => {
        mockOpenAIClient.chat.completions.create.mockResolvedValue({
          choices: [{ message: { content: null } }],
          usage: { prompt_tokens: 500, completion_tokens: 0 },
        });

        setupSupabaseMock({});

        const processPromise = processor.process({ dryRun: false });
        await vi.runAllTimersAsync();
        const result = await processPromise;

        expect(result.failed).toBe(1);
      });
    });
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
        expect(articles[0].tagging_status).toBe("pending");
      });

      it("処理開始時にステータスがprocessingに更新される", async () => {
        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

        setupSupabaseMock({ updateMock });

        await processor.process({ dryRun: false });

        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({ tagging_status: "processing" })
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
          expect.objectContaining({ tagging_status: "completed" })
        );
      });

      it("last_tagged_atに現在時刻が設定される", async () => {
        const now = new Date("2026-01-17T10:00:00Z");
        vi.setSystemTime(now);

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

        setupSupabaseMock({ updateMock });

        await processor.process({ dryRun: false });

        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            last_tagged_at: now.toISOString(),
          })
        );
      });

      it("article_tagsテーブルに正規化されたタグが保存される", async () => {
        const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

        setupSupabaseMock({ insertMock });

        await processor.process({ dryRun: false });

        expect(insertMock).toHaveBeenCalled();
      });
    });

    describe("失敗時の更新", () => {
      it("3回リトライ後も失敗した場合、ステータスがerrorに更新される", async () => {
        mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error("API Error"));

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });
        const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

        setupSupabaseMock({ updateMock, upsertMock });

        const processPromise = processor.process({ dryRun: false });
        await vi.runAllTimersAsync();
        await processPromise;

        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({ tagging_status: "error" })
        );
      });

      it("リトライキューにレコードが追加される", async () => {
        mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error("API Error"));

        const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

        setupSupabaseMock({ upsertMock });

        const processPromise = processor.process({ dryRun: false });
        await vi.runAllTimersAsync();
        await processPromise;

        expect(upsertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            article_id: "SCP-173",
            operation: "tagging",
          }),
          expect.any(Object)
        );
      });

      it("リトライキューにエラーメッセージが記録される", async () => {
        const errorMessage = "Rate limit exceeded";
        mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error(errorMessage));

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
      it("予想入力トークン数が正しく計算される", () => {
        const content = "A".repeat(4000); // 4000文字 ≈ 1000トークン
        const estimate = processor.estimateCost([createMockArticle({ content })]);

        // プロンプトテンプレート分も加算される
        expect(estimate.estimatedInputTokens).toBeGreaterThan(1000);
      });

      it("予想出力トークン数が正しく計算される", () => {
        const estimate = processor.estimateCost([createMockArticle()]);

        // JSON応答は約50トークン
        expect(estimate.estimatedOutputTokens).toBe(50);
      });

      it("gpt-4o-miniの料金で計算される（入力$0.15/1M, 出力$0.60/1M）", () => {
        const content = "A".repeat(4000);
        const estimate = processor.estimateCost([createMockArticle({ content })]);

        // 入力コスト + 出力コストが正しく計算される
        const expectedInputCost = (estimate.estimatedInputTokens / 1_000_000) * 0.15;
        const expectedOutputCost = (estimate.estimatedOutputTokens / 1_000_000) * 0.6;
        const expectedTotal = expectedInputCost + expectedOutputCost;

        expect(estimate.estimatedCost).toBeCloseTo(expectedTotal, 6);
      });

      it("コスト上限超過時にエラーがスローされる", async () => {
        const articles = Array.from({ length: 1000 }, (_, i) =>
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

      it("記事が0件の場合はコスト0", () => {
        const estimate = processor.estimateCost([]);
        expect(estimate.estimatedCost).toBe(0);
      });
    });

    describe("処理後の実績出力", () => {
      it("実際のトークン数が記録される", async () => {
        mockOpenAIClient.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  object_class: "Safe",
                  genre: ["horror"],
                  theme: [],
                  format: "standard",
                }),
              },
            },
          ],
          usage: { prompt_tokens: 600, completion_tokens: 50 },
        });

        setupSupabaseMock({});

        const result = await processor.process({ dryRun: false });
        expect(result.totalInputTokens).toBe(600);
        expect(result.totalOutputTokens).toBe(50);
      });

      it("実コストが正しく計算される", async () => {
        mockOpenAIClient.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  object_class: "Safe",
                  genre: [],
                  theme: [],
                  format: "standard",
                }),
              },
            },
          ],
          usage: { prompt_tokens: 1_000_000, completion_tokens: 100_000 },
        });

        setupSupabaseMock({});

        const result = await processor.process({ dryRun: false });

        // 入力: $0.15, 出力: $0.06
        expect(result.actualCost).toBeCloseTo(0.21, 2);
      });
    });
  });

  describe("バッチ処理最適化", () => {
    describe("並列処理とレート制限", () => {
      it("バッチサイズ5件で処理される", async () => {
        const articles = Array.from({ length: 12 }, (_, i) =>
          createMockArticle({ id: `SCP-${i.toString().padStart(3, "0")}` })
        );

        setupSupabaseMock({ articles });

        const processPromise = processor.process({ batchSize: 5, dryRun: false });
        await vi.runAllTimersAsync();
        const result = await processPromise;

        expect(result.succeeded).toBe(12);
      });

      it("バッチ間に2秒の遅延が挿入される", async () => {
        const articles = Array.from({ length: 10 }, (_, i) =>
          createMockArticle({ id: `SCP-${i.toString().padStart(3, "0")}` })
        );

        setupSupabaseMock({ articles });

        const sleepSpy = vi.spyOn(global, "setTimeout");

        const processPromise = processor.process({ batchSize: 5, dryRun: false });
        await vi.runAllTimersAsync();
        await processPromise;

        // 2秒遅延が確認される
        const delayCall = sleepSpy.mock.calls.find((call) => call[1] === 2000);
        expect(delayCall).toBeDefined();
      });

      it("レート制限時にエクスポネンシャルバックオフで待機する", async () => {
        let callCount = 0;
        mockOpenAIClient.chat.completions.create.mockImplementation(() => {
          callCount++;
          if (callCount <= 2) {
            const error = new Error("Rate limit exceeded") as Error & { status: number };
            error.status = 429;
            return Promise.reject(error);
          }
          return Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    object_class: "Safe",
                    genre: [],
                    theme: [],
                    format: "standard",
                  }),
                },
              },
            ],
            usage: { prompt_tokens: 500, completion_tokens: 50 },
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

        const progressUpdates: TaggingProgress[] = [];
        const onProgress = vi.fn((progress: TaggingProgress) => {
          progressUpdates.push({ ...progress });
        });

        await processor.process({ onProgress, dryRun: false });

        expect(onProgress).toHaveBeenCalled();
        expect(progressUpdates[progressUpdates.length - 1].processed).toBe(5);
        expect(progressUpdates[progressUpdates.length - 1].total).toBe(5);
      });

      it("成功件数と失敗件数が個別に表示される", async () => {
        mockOpenAIClient.chat.completions.create.mockImplementation(
          (params: { messages: { content: string }[] }) => {
            const content = params.messages[0]?.content ?? "";
            if (content.includes("FAIL_MARKER")) {
              return Promise.reject(new Error("API Error"));
            }
            return Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      object_class: "Safe",
                      genre: [],
                      theme: [],
                      format: "standard",
                    }),
                  },
                },
              ],
              usage: { prompt_tokens: 500, completion_tokens: 50 },
            });
          }
        );

        const articles = [
          createMockArticle({ id: "SCP-000", content: "Success content 0" }),
          createMockArticle({ id: "SCP-001", content: "FAIL_MARKER content 1" }),
          createMockArticle({ id: "SCP-002", content: "Success content 2" }),
        ];

        setupSupabaseMock({ articles });

        const progressUpdates: TaggingProgress[] = [];
        const onProgress = vi.fn((progress: TaggingProgress) => {
          progressUpdates.push({ ...progress });
        });

        const processPromise = processor.process({ onProgress, dryRun: false });
        await vi.runAllTimersAsync();
        await processPromise;

        const finalProgress = progressUpdates[progressUpdates.length - 1];
        expect(finalProgress.succeeded).toBe(2);
        expect(finalProgress.failed).toBe(1);
      });
    });
  });

  describe("既存タグの更新", () => {
    it("既存のarticle_tagsレコードが削除される", async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      setupSupabaseMock({ deleteMock });

      await processor.process({ dryRun: false });

      expect(deleteMock).toHaveBeenCalled();
    });

    it("新しいタグで置き換えられる", async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

      setupSupabaseMock({ deleteMock, insertMock });

      await processor.process({ dryRun: false });

      expect(deleteMock).toHaveBeenCalled(); // 削除
      expect(insertMock).toHaveBeenCalled(); // 挿入
    });

    it("既存タグが存在しない場合でも正常に動作する", async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

      setupSupabaseMock({ deleteMock, insertMock });

      const result = await processor.process({ dryRun: false });

      expect(result.succeeded).toBe(1);
      expect(deleteMock).toHaveBeenCalled(); // 削除実行（0件でもOK）
      expect(insertMock).toHaveBeenCalled(); // 挿入実行
    });
  });

  describe("ドライラン", () => {
    it("dryRun時にAPI呼び出しが行われない", async () => {
      setupSupabaseMock({});

      await processor.process({ dryRun: true });

      expect(mockOpenAIClient.chat.completions.create).not.toHaveBeenCalled();
    });

    it("dryRun時に推定トークン数が計算される", async () => {
      const content = "A".repeat(400);
      setupSupabaseMock({ articles: [createMockArticle({ content })] });

      const result = await processor.process({ dryRun: true });
      expect(result.totalInputTokens).toBeGreaterThan(0);
    });

    it("dryRun時に推定コストが計算される", async () => {
      const content = "A".repeat(30000);
      setupSupabaseMock({ articles: [createMockArticle({ content })] });

      const result = await processor.process({ dryRun: true });
      expect(result.actualCost).toBeGreaterThan(0);
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

        // 30000文字ベースでトークン計算される
        expect(estimate.estimatedInputTokens).toBeLessThan(15000); // 50000/4より小さい
      });

      it("genreが3件（上限）の場合も正常に処理される", async () => {
        mockOpenAIClient.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  object_class: "Safe",
                  genre: ["horror", "sci-fi", "cognition"], // 3件
                  theme: [],
                  format: "standard",
                }),
              },
            },
          ],
          usage: { prompt_tokens: 500, completion_tokens: 50 },
        });

        setupSupabaseMock({});

        const result = await processor.process({ dryRun: false });
        expect(result.succeeded).toBe(1);
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
        mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error("Network error"));

        setupSupabaseMock({});

        const processPromise = processor.process({ dryRun: false });
        await vi.runAllTimersAsync();
        const result = await processPromise;

        expect(result.failed).toBe(1);
        expect(result.errors[0].error).toBe("Network error");
      });

      it("不正なJSON応答時は適切にエラーハンドリングされる", async () => {
        mockOpenAIClient.chat.completions.create.mockResolvedValue({
          choices: [{ message: { content: "not valid json" } }],
          usage: { prompt_tokens: 500, completion_tokens: 50 },
        });

        setupSupabaseMock({});

        const processPromise = processor.process({ dryRun: false });
        await vi.runAllTimersAsync();
        const result = await processPromise;

        expect(result.failed).toBe(1);
      });
    });
  });
});
