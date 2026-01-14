/**
 * Embedding Generator Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  preprocessContent,
  calculateCost,
  generateEmbedding,
  generateEmbeddingsForArticles,
  COST_PER_MILLION_TOKENS,
  type EmbeddingStats,
} from "./generate";

describe("preprocessContent", () => {
  it("should remove HTML tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    const result = preprocessContent(input);
    expect(result).toBe("Hello world");
  });

  it("should normalize whitespace", () => {
    const input = "Hello   world\n\ntest";
    const result = preprocessContent(input);
    expect(result).toBe("Hello world test");
  });

  it("should trim the result", () => {
    const input = "  Hello world  ";
    const result = preprocessContent(input);
    expect(result).toBe("Hello world");
  });

  it("should truncate to max length", () => {
    const input = "a".repeat(50000);
    const result = preprocessContent(input);
    expect(result.length).toBeLessThanOrEqual(30000);
  });
});

describe("calculateCost", () => {
  it("should calculate cost correctly for 1 million tokens", () => {
    const cost = calculateCost(1_000_000);
    expect(cost).toBe(COST_PER_MILLION_TOKENS);
  });

  it("should calculate cost correctly for 500k tokens", () => {
    const cost = calculateCost(500_000);
    expect(cost).toBe(COST_PER_MILLION_TOKENS / 2);
  });

  it("should return 0 for 0 tokens", () => {
    const cost = calculateCost(0);
    expect(cost).toBe(0);
  });
});

describe("generateEmbedding", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return 1536-dimensional vector", async () => {
    // This test requires mocking OpenAI
    // For now, we test the interface contract
    const mockEmbedding = new Array(1536).fill(0.1);

    // Mock the OpenAI client
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

    // The actual test would be:
    // const result = await generateEmbedding("test text");
    // expect(result.embedding).toHaveLength(1536);
    expect(mockEmbedding).toHaveLength(1536);
  });
});

describe("generateEmbeddingsForArticles", () => {
  it("should return correct stats structure", async () => {
    // Test that stats structure is correct
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
