/**
 * クローラー型定義のテスト
 */
import { describe, it, expect } from "vitest";
import type { ArticleIndex, ArticleContent, CrawlProgress, BranchCrawler } from "../types";

describe("クローラー型定義", () => {
  describe("ArticleIndex型", () => {
    it("必須プロパティ（id, title, url, series）を持つ", () => {
      const index: ArticleIndex = {
        id: "SCP-173",
        title: "The Sculpture",
        url: "https://scp-wiki.wikidot.com/scp-173",
        series: "series-1",
      };

      expect(index.id).toBe("SCP-173");
      expect(index.title).toBe("The Sculpture");
      expect(index.url).toMatch(/^https?:\/\//);
      expect(index.series).toBe("series-1");
    });
  });

  describe("ArticleContent型", () => {
    it("必須プロパティを持つ", () => {
      const content: ArticleContent = {
        id: "SCP-173",
        title: "The Sculpture",
        content: "Article content...",
        rating: 100,
        tags: ["safe", "sculpture"],
        createdAt: new Date("2008-07-19"),
        updatedAt: new Date("2023-01-01"),
      };

      expect(content.id).toBeDefined();
      expect(content.title).toBeDefined();
      expect(content.content).toBeDefined();
      expect(content.rating).toBe(100);
      expect(content.tags).toBeInstanceOf(Array);
      expect(content.createdAt).toBeInstanceOf(Date);
      expect(content.updatedAt).toBeInstanceOf(Date);
    });

    it("オプショナルプロパティ（sourceHash）を持てる", () => {
      const content: ArticleContent = {
        id: "SCP-173",
        title: "Test",
        content: "Content",
        rating: 0,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceHash: "abc123def456",
      };

      expect(content.sourceHash).toBe("abc123def456");
    });

    it("tags空配列を許可する", () => {
      const content: ArticleContent = {
        id: "SCP-000",
        title: "Empty Tags",
        content: "",
        rating: 0,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(content.tags).toEqual([]);
    });
  });

  describe("CrawlProgress型", () => {
    it("phaseプロパティがfetch_indexを持てる", () => {
      const progress: CrawlProgress = {
        phase: "fetch_index",
        current: 0,
        total: 100,
      };

      expect(progress.phase).toBe("fetch_index");
      expect(progress.current).toBe(0);
      expect(progress.total).toBe(100);
    });

    it("phaseプロパティがfetch_contentを持てる", () => {
      const progress: CrawlProgress = {
        phase: "fetch_content",
        current: 50,
        total: 100,
      };

      expect(progress.phase).toBe("fetch_content");
    });

    it("phaseプロパティがsave_dbを持てる", () => {
      const progress: CrawlProgress = {
        phase: "save_db",
        current: 100,
        total: 100,
      };

      expect(progress.phase).toBe("save_db");
    });
  });

  describe("BranchCrawlerインターフェース", () => {
    it("必須プロパティとメソッドを持つオブジェクトを定義できる", () => {
      const mockCrawler: BranchCrawler = {
        lang: "en",
        crawlerType: "api",
        fetchArticleList: async () => [],
        fetchArticleContent: async (id: string) => ({
          id,
          title: "Test",
          content: "Content",
          rating: 100,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        getLastModified: async () => new Date(),
      };

      expect(mockCrawler.lang).toBe("en");
      expect(mockCrawler.crawlerType).toBe("api");
      expect(typeof mockCrawler.fetchArticleList).toBe("function");
      expect(typeof mockCrawler.fetchArticleContent).toBe("function");
      expect(typeof mockCrawler.getLastModified).toBe("function");
    });

    it("crawlerTypeがscrapingを持てる", () => {
      const mockCrawler: BranchCrawler = {
        lang: "ja",
        crawlerType: "scraping",
        fetchArticleList: async () => [],
        fetchArticleContent: async (id: string) => ({
          id,
          title: "Test",
          content: "Content",
          rating: 0,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        getLastModified: async () => null,
      };

      expect(mockCrawler.crawlerType).toBe("scraping");
    });
  });
});
