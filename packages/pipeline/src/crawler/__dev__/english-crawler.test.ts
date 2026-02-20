/**
 * EnglishCrawler のテスト
 * Subtask: 014-01-02
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EnglishCrawler } from "../english-crawler";

/** テスト用 ScpIndexItem ファクトリ */
const createMockIndexItem = (overrides?: Record<string, unknown>) => ({
  scp: "SCP-173",
  title: "The Sculpture",
  rating: 7500,
  content_file: "content_series-1.json",
  link: "/scp-173",
  tags: ["euclid", "sculpture"],
  created_at: "2007-06-22T00:00:00Z",
  creator: "Anonymous",
  ...overrides,
});

/** テスト用 ScpContentItem ファクトリ */
const createMockContentItem = (overrides?: Record<string, unknown>) => ({
  ...createMockIndexItem(),
  raw_content: "<p>SCP-173 is to be kept in a locked container.</p>",
  raw_source: "",
  ...overrides,
});

/** fetch モック用ヘルパー */
const mockFetchResponses = (index: Record<string, unknown>, content: Record<string, unknown>) => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(index) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(content) })
  );
};

describe("EnglishCrawler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchArticleContent - creatorフィールドのマッピング", () => {
    it("APIレスポンスのcreatorがArticleContent.authorにマッピングされる", async () => {
      const mockIndex = { "scp-173": createMockIndexItem({ creator: "Dr. Clef" }) };
      const mockContent = { "scp-173": createMockContentItem({ creator: "Dr. Clef" }) };
      mockFetchResponses(mockIndex, mockContent);

      const crawler = new EnglishCrawler();
      const result = await crawler.fetchArticleContent("SCP-173");

      expect(result.author).toBe("Dr. Clef");
    });

    it("creatorが空文字列の場合、authorはundefinedになる", async () => {
      const mockIndex = { "scp-173": createMockIndexItem({ creator: "" }) };
      const mockContent = { "scp-173": createMockContentItem({ creator: "" }) };
      mockFetchResponses(mockIndex, mockContent);

      const crawler = new EnglishCrawler();
      const result = await crawler.fetchArticleContent("SCP-173");

      expect(result.author).toBeUndefined();
    });

    it("既存フィールド（id, title, rating等）が引き続き正しく返される", async () => {
      const mockIndex = { "scp-173": createMockIndexItem() };
      const mockContent = { "scp-173": createMockContentItem() };
      mockFetchResponses(mockIndex, mockContent);

      const crawler = new EnglishCrawler();
      const result = await crawler.fetchArticleContent("SCP-173");

      expect(result.id).toBe("SCP-173");
      expect(result.title).toBe("The Sculpture");
      expect(result.rating).toBe(7500);
      expect(result.tags).toEqual(["euclid", "sculpture"]);
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });
});
