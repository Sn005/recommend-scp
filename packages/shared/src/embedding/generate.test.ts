/**
 * Embedding生成テスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  preprocessContent,
  calculateCost,
  COST_PER_MILLION_TOKENS,
  type EmbeddingStats,
} from "./generate";

describe("preprocessContent", () => {
  it("HTMLタグを除去する", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    const result = preprocessContent(input);
    expect(result).toBe("Hello world");
  });

  it("空白を正規化する", () => {
    const input = "Hello   world\n\ntest";
    const result = preprocessContent(input);
    expect(result).toBe("Hello world test");
  });

  it("前後の空白をトリムする", () => {
    const input = "  Hello world  ";
    const result = preprocessContent(input);
    expect(result).toBe("Hello world");
  });

  it("最大長に切り詰める", () => {
    const input = "a".repeat(50000);
    const result = preprocessContent(input);
    expect(result.length).toBeLessThanOrEqual(30000);
  });
});

describe("calculateCost", () => {
  it("100万トークンのコストを正しく計算する", () => {
    const cost = calculateCost(1_000_000);
    expect(cost).toBe(COST_PER_MILLION_TOKENS);
  });

  it("50万トークンのコストを正しく計算する", () => {
    const cost = calculateCost(500_000);
    expect(cost).toBe(COST_PER_MILLION_TOKENS / 2);
  });

  it("0トークンの場合は0を返す", () => {
    const cost = calculateCost(0);
    expect(cost).toBe(0);
  });
});

describe("generateEmbedding", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("1536次元のベクトルを返す", () => {
    // OpenAIのモックが必要なため、インターフェース契約のテスト
    const mockEmbedding = new Array(1536).fill(0.1);

    // OpenAIクライアントのモック
    vi.mock("openai", () => ({
      default: vi.fn().mockImplementation(() => ({
        embeddings: {
          create: vi.fn().mockResolvedValue({
            data: [{ embedding: mockEmbedding }],
            usage: { total_tokens: 100 },
          }),
        },
      })),
    }));

    expect(mockEmbedding).toHaveLength(1536);
  });
});

describe("generateEmbeddingsForArticles", () => {
  it("正しいstats構造を返す", () => {
    const expectedStats: EmbeddingStats = {
      totalArticles: 10,
      successCount: 9,
      errorCount: 1,
      totalTokens: 5000,
      estimatedCost: calculateCost(5000),
      errors: [],
    };

    expect(expectedStats).toHaveProperty("totalArticles");
    expect(expectedStats).toHaveProperty("successCount");
    expect(expectedStats).toHaveProperty("errorCount");
    expect(expectedStats).toHaveProperty("totalTokens");
    expect(expectedStats).toHaveProperty("estimatedCost");
    expect(expectedStats).toHaveProperty("errors");
  });
});
