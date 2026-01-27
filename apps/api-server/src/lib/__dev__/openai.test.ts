/**
 * @file createEmbedding テスト
 * @description OpenAI Embedding API呼び出しのテスト
 * @see specs/005-backend-api/005-04-articles-api/005-04-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// envモジュールをモック
vi.mock("@recommend-scp/shared/lib/env", () => ({
  env: {
    OPENAI_API_KEY: "test-api-key",
  },
}));

// モック用のcreate関数
const mockCreate = vi.fn();

// OpenAI モジュールをモック（class構文を使用）
vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      embeddings = {
        create: mockCreate,
      };
    },
  };
});

describe("createEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // モジュールキャッシュをクリアして再インポート
    vi.resetModules();
  });

  it("テキストからベクトルを取得できる", async () => {
    const mockEmbedding = [0.1, 0.2, 0.3];
    mockCreate.mockResolvedValue({
      data: [{ embedding: mockEmbedding }],
    });

    // モジュールを再インポート
    const { createEmbedding } = await import("../openai");
    const result = await createEmbedding("test text");

    expect(result).toEqual(mockEmbedding);
    expect(mockCreate).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: "test text",
    });
  });

  it("日本語テキストを処理できる", async () => {
    const mockEmbedding = [0.4, 0.5, 0.6];
    mockCreate.mockResolvedValue({
      data: [{ embedding: mockEmbedding }],
    });

    const { createEmbedding } = await import("../openai");
    const result = await createEmbedding("ホラー系のscp");

    expect(result).toEqual(mockEmbedding);
    expect(mockCreate).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: "ホラー系のscp",
    });
  });

  it("空文字列でもベクトルを返す", async () => {
    const mockEmbedding = [0.0, 0.0, 0.0];
    mockCreate.mockResolvedValue({
      data: [{ embedding: mockEmbedding }],
    });

    const { createEmbedding } = await import("../openai");
    const result = await createEmbedding("");

    expect(result).toEqual(mockEmbedding);
  });

  it("API認証エラー時に例外をthrowする", async () => {
    const authError = new Error("Invalid API key");
    mockCreate.mockRejectedValue(authError);

    const { createEmbedding } = await import("../openai");
    await expect(createEmbedding("test")).rejects.toThrow("Invalid API key");
  });

  it("レート制限エラー時に例外をthrowする", async () => {
    const rateLimitError = new Error("Rate limit exceeded");
    mockCreate.mockRejectedValue(rateLimitError);

    const { createEmbedding } = await import("../openai");
    await expect(createEmbedding("test")).rejects.toThrow("Rate limit exceeded");
  });
});
