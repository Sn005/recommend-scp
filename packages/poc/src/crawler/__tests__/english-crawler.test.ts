/**
 * EnglishCrawlerのテスト
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EnglishCrawler } from "../english-crawler";

// fetchをモック化
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("EnglishCrawler", () => {
  let crawler: EnglishCrawler;

  beforeEach(() => {
    crawler = new EnglishCrawler();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("プロパティ", () => {
    it("langが'en'である", () => {
      expect(crawler.lang).toBe("en");
    });

    it("crawlerTypeが'api'である", () => {
      expect(crawler.crawlerType).toBe("api");
    });
  });

  describe("fetchArticleList", () => {
    it("記事インデックスのリストを取得できる", async () => {
      const mockIndex = {
        "scp-173": {
          link: "/scp-173",
          title: "The Sculpture",
          rating: 7000,
          content_file: "content_series-1.json",
          scp: "SCP-173",
          tags: ["safe", "sculpture"],
          created_at: "2008-07-19T00:00:00Z",
          creator: "Moto42",
        },
        "scp-682": {
          link: "/scp-682",
          title: "Hard-to-Destroy Reptile",
          rating: 5000,
          content_file: "content_series-1.json",
          scp: "SCP-682",
          tags: ["keter", "reptile"],
          created_at: "2008-07-25T00:00:00Z",
          creator: "Dr Gears",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });

      const articles = await crawler.fetchArticleList();

      expect(articles).toBeInstanceOf(Array);
      expect(articles.length).toBe(2);

      const first = articles[0];
      expect(first.id).toBe("SCP-173");
      expect(first.title).toBe("The Sculpture");
      expect(first.url).toContain("scp-wiki.wikidot.com");
      expect(first.series).toBe("series-1");
    });

    it("SCP形式でないエントリは除外される", async () => {
      const mockIndex = {
        "scp-173": {
          link: "/scp-173",
          title: "The Sculpture",
          rating: 7000,
          content_file: "content_series-1.json",
          scp: "SCP-173",
          tags: ["safe"],
          created_at: "2008-07-19T00:00:00Z",
          creator: "Moto42",
        },
        "about-the-scp-foundation": {
          link: "/about",
          title: "About",
          rating: 1000,
          content_file: "content_misc.json",
          scp: "",
          tags: [],
          created_at: "2008-01-01T00:00:00Z",
          creator: "Admin",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });

      const articles = await crawler.fetchArticleList();

      expect(articles.length).toBe(1);
      expect(articles[0].id).toBe("SCP-173");
    });

    it("API 404エラーでエラーをスローする", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(crawler.fetchArticleList()).rejects.toThrow(/404/);
    });
  });

  describe("fetchArticleContent", () => {
    it("指定IDの記事コンテンツを取得できる", async () => {
      const mockContent = {
        "scp-173": {
          link: "/scp-173",
          title: "The Sculpture",
          rating: 7000,
          content_file: "content_series-1.json",
          scp: "SCP-173",
          tags: ["safe", "sculpture"],
          created_at: "2008-07-19T00:00:00Z",
          creator: "Moto42",
          raw_content: "<p>Item #: SCP-173</p><p>Object Class: Safe</p>",
          raw_source: "...",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContent,
      });

      const content = await crawler.fetchArticleContent("SCP-173");

      expect(content.id).toBe("SCP-173");
      expect(content.title).toBe("The Sculpture");
      expect(content.content).not.toContain("<p>");
      expect(content.rating).toBe(7000);
      expect(content.tags).toContain("safe");
      expect(content.createdAt).toBeInstanceOf(Date);
    });

    it("小文字IDを正規化して受け入れる", async () => {
      const mockContent = {
        "scp-173": {
          link: "/scp-173",
          title: "The Sculpture",
          rating: 7000,
          content_file: "content_series-1.json",
          scp: "SCP-173",
          tags: [],
          created_at: "2008-07-19T00:00:00Z",
          creator: "Moto42",
          raw_content: "Content",
          raw_source: "...",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContent,
      });

      const content = await crawler.fetchArticleContent("scp-173");
      expect(content.id).toBe("SCP-173");
    });

    it("空文字列IDでエラーをスローする", async () => {
      await expect(crawler.fetchArticleContent("")).rejects.toThrow();
    });

    it("不正なID形式でエラーをスローする", async () => {
      await expect(crawler.fetchArticleContent("invalid-id")).rejects.toThrow(
        /Invalid SCP ID format/
      );
    });

    it("存在しない記事IDでエラーをスローする", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(crawler.fetchArticleContent("SCP-99999")).rejects.toThrow(/not found/);
    });
  });

  describe("getLastModified", () => {
    it("指定IDの最終更新日時を取得できる", async () => {
      const mockIndex = {
        "scp-173": {
          link: "/scp-173",
          title: "The Sculpture",
          rating: 7000,
          content_file: "content_series-1.json",
          scp: "SCP-173",
          tags: [],
          created_at: "2008-07-19T00:00:00Z",
          creator: "Moto42",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });

      const lastModified = await crawler.getLastModified("scp-173");

      expect(lastModified).toBeInstanceOf(Date);
      expect(lastModified?.getFullYear()).toBe(2008);
    });

    it("存在しない記事IDでnullを返す", async () => {
      const mockIndex = {};

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      });

      const lastModified = await crawler.getLastModified("scp-99999");
      expect(lastModified).toBeNull();
    });
  });
});
