/**
 * タグ抽出テスト
 */

import { describe, it, expect } from "vitest";
import {
  parseTagResponse,
  calculateTaggingCost,
  EXTRACTION_PROMPT,
  COST_PER_MILLION_TOKENS_INPUT,
  COST_PER_MILLION_TOKENS_OUTPUT,
  type TaggingStats,
} from "./extract";
import type { ExtractedTags } from "../types";

describe("parseTagResponse", () => {
  it("有効なJSONレスポンスをパースできる", () => {
    const response = JSON.stringify({
      object_class: "Euclid",
      genre: ["horror", "sci-fi"],
      theme: ["cognition", "memetic"],
      format: "standard",
    });

    const result = parseTagResponse(response);

    expect(result.object_class).toBe("Euclid");
    expect(result.genre).toEqual(["horror", "sci-fi"]);
    expect(result.theme).toEqual(["cognition", "memetic"]);
    expect(result.format).toBe("standard");
  });

  it("Markdownコードブロック付きのJSONを処理できる", () => {
    const response = `\`\`\`json
{
  "object_class": "Safe",
  "genre": ["comedy"],
  "theme": ["biological"],
  "format": "interview"
}
\`\`\``;

    const result = parseTagResponse(response);

    expect(result.object_class).toBe("Safe");
    expect(result.genre).toEqual(["comedy"]);
  });

  it("フィールドが欠落している場合にデフォルト値を提供する", () => {
    const response = JSON.stringify({
      object_class: "Keter",
    });

    const result = parseTagResponse(response);

    expect(result.object_class).toBe("Keter");
    expect(result.genre).toEqual([]);
    expect(result.theme).toEqual([]);
    expect(result.format).toBe("standard");
  });

  it("無効なJSONでエラーをスローする", () => {
    const response = "not a json";

    expect(() => parseTagResponse(response)).toThrow();
  });

  it("genre/themeが単一文字列の場合に配列に変換する", () => {
    const response = JSON.stringify({
      object_class: "Safe",
      genre: "horror",
      theme: "memetic",
      format: "standard",
    });

    const result = parseTagResponse(response);

    expect(result.genre).toEqual(["horror"]);
    expect(result.theme).toEqual(["memetic"]);
  });
});

describe("calculateTaggingCost", () => {
  it("OpenAI gpt-4o-miniのコストを正しく計算する", () => {
    const inputTokens = 1_000_000;
    const outputTokens = 100_000;

    const cost = calculateTaggingCost(inputTokens, outputTokens, "openai");

    // gpt-4o-mini: input $0.15/1M, output $0.60/1M
    expect(cost).toBeCloseTo(0.15 + 0.06, 2);
  });

  it("Claude Haikuのコストを正しく計算する", () => {
    const inputTokens = 1_000_000;
    const outputTokens = 100_000;

    const cost = calculateTaggingCost(inputTokens, outputTokens, "claude");

    // claude-3-haiku: input $0.25/1M, output $1.25/1M
    expect(cost).toBeCloseTo(0.25 + 0.125, 2);
  });

  it("0トークンの場合に0を返す", () => {
    const cost = calculateTaggingCost(0, 0, "openai");
    expect(cost).toBe(0);
  });
});

describe("EXTRACTION_PROMPT", () => {
  it("必須カテゴリフィールドを含む", () => {
    expect(EXTRACTION_PROMPT).toContain("object_class");
    expect(EXTRACTION_PROMPT).toContain("genre");
    expect(EXTRACTION_PROMPT).toContain("theme");
    expect(EXTRACTION_PROMPT).toContain("format");
  });

  it("JSON出力指示を含む", () => {
    expect(EXTRACTION_PROMPT).toContain("JSON");
  });
});

describe("TaggingStats", () => {
  it("正しい構造を持つ", () => {
    const stats: TaggingStats = {
      totalArticles: 10,
      successCount: 9,
      errorCount: 1,
      totalInputTokens: 50000,
      totalOutputTokens: 5000,
      estimatedCost: 0.01,
      uniqueTags: {
        object_class: ["Safe", "Euclid"],
        genre: ["horror", "sci-fi"],
        theme: ["cognition"],
        format: ["standard"],
      },
      errors: [],
    };

    expect(stats).toHaveProperty("totalArticles");
    expect(stats).toHaveProperty("successCount");
    expect(stats).toHaveProperty("errorCount");
    expect(stats).toHaveProperty("totalInputTokens");
    expect(stats).toHaveProperty("totalOutputTokens");
    expect(stats).toHaveProperty("estimatedCost");
    expect(stats).toHaveProperty("uniqueTags");
    expect(stats).toHaveProperty("errors");
  });
});
