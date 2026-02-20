/**
 * クローラー型定義のテスト
 * Subtask: 003-02-01
 */

import { describe, it, expect } from "vitest";
import type {
  ArticleIndex,
  ArticleContent,
  ArticleForDb,
  CrawlProgress,
  BranchCrawler,
} from "../types";

/** テスト用のデフォルトArticleContent */
const createMockArticleContent = (overrides?: Partial<ArticleContent>): ArticleContent => ({
  id: "",
  title: "",
  content: "",
  rating: 0,
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("クローラー型定義", () => {
  describe("ArticleIndex", () => {
    it("必須プロパティ（id, title, url, series）を持つ", () => {
      const index: ArticleIndex = {
        id: "SCP-173",
        title: "The Sculpture",
        url: "https://scp-wiki.wikidot.com/scp-173",
        series: "series-1",
      };

      expect(index.id).toBe("SCP-173");
      expect(index.title).toBe("The Sculpture");
      expect(index.url).toBe("https://scp-wiki.wikidot.com/scp-173");
      expect(index.series).toBe("series-1");
    });
  });

  describe("ArticleContent", () => {
    it("必須プロパティ（id, title, content, rating, tags, createdAt, updatedAt）を持つ", () => {
      const content: ArticleContent = {
        id: "SCP-173",
        title: "The Sculpture",
        content: "SCP-173 is to be kept in a locked container...",
        rating: 7500,
        tags: ["euclid", "sculpture", "autonomous"],
        createdAt: new Date("2007-06-22"),
        updatedAt: new Date("2023-01-15"),
      };

      expect(content.id).toBe("SCP-173");
      expect(content.title).toBe("The Sculpture");
      expect(content.content).toContain("SCP-173");
      expect(content.rating).toBe(7500);
      expect(content.tags).toEqual(["euclid", "sculpture", "autonomous"]);
      expect(content.createdAt).toBeInstanceOf(Date);
      expect(content.updatedAt).toBeInstanceOf(Date);
    });

    it("オプショナルなsourceHashプロパティを持てる", () => {
      const content: ArticleContent = {
        id: "SCP-173",
        title: "The Sculpture",
        content: "SCP-173 is to be kept...",
        rating: 7500,
        tags: ["euclid"],
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceHash: "abc123def456",
      };

      expect(content.sourceHash).toBe("abc123def456");
    });

    it("オプショナルなauthorプロパティを持てる", () => {
      const content: ArticleContent = {
        id: "SCP-173",
        title: "The Sculpture",
        content: "SCP-173 is to be kept in a locked container...",
        rating: 7500,
        tags: ["euclid", "sculpture", "autonomous"],
        createdAt: new Date("2007-06-22"),
        updatedAt: new Date("2023-01-15"),
        author: "Anonymous",
      };

      expect(content.author).toBe("Anonymous");
    });

    it("authorプロパティはオプショナルなので省略できる", () => {
      const content: ArticleContent = {
        id: "SCP-173",
        title: "The Sculpture",
        content: "SCP-173 is to be kept in a locked container...",
        rating: 7500,
        tags: ["euclid"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(content.author).toBeUndefined();
    });
  });

  describe("ArticleForDb", () => {
    it("オプショナルなauthorプロパティを持てる", () => {
      const forDb: ArticleForDb = {
        article_id: "scp-173",
        lang: "en",
        title: "The Sculpture",
        content: "...",
        rating: 7500,
        tags: ["euclid"],
        fetched_at: new Date().toISOString(),
        embedding_status: "pending",
        tagging_status: "pending",
        author: "Anonymous",
      };

      expect(forDb.author).toBe("Anonymous");
    });

    it("authorプロパティはオプショナルなので省略できる", () => {
      const forDb: ArticleForDb = {
        article_id: "scp-173",
        lang: "en",
        title: "The Sculpture",
        content: "...",
        rating: 7500,
        tags: ["euclid"],
        fetched_at: new Date().toISOString(),
        embedding_status: "pending",
        tagging_status: "pending",
      };

      expect(forDb.author).toBeUndefined();
    });
  });

  describe("CrawlProgress", () => {
    it("必須プロパティ（phase, current, total）を持つ", () => {
      const progress: CrawlProgress = {
        phase: "fetch_index",
        current: 10,
        total: 100,
      };

      expect(progress.phase).toBe("fetch_index");
      expect(progress.current).toBe(10);
      expect(progress.total).toBe(100);
    });

    it("phaseは3つの値のいずれか", () => {
      const phases: CrawlProgress["phase"][] = ["fetch_index", "fetch_content", "save_db"];

      phases.forEach((phase) => {
        const progress: CrawlProgress = { phase, current: 0, total: 0 };
        expect(["fetch_index", "fetch_content", "save_db"]).toContain(progress.phase);
      });
    });
  });

  describe("BranchCrawler", () => {
    it("langとcrawlerTypeプロパティを持つ", () => {
      // モッククローラーでインターフェースを検証
      const mockCrawler: BranchCrawler = {
        lang: "en",
        crawlerType: "api",
        fetchArticleList: () => Promise.resolve([]),
        fetchArticleContent: () =>
          Promise.resolve(createMockArticleContent({ id: "SCP-001", title: "Test" })),
        getLastModified: () => Promise.resolve(null),
      };

      expect(mockCrawler.lang).toBe("en");
      expect(mockCrawler.crawlerType).toBe("api");
    });

    it("crawlerTypeはapiまたはscraping", () => {
      const apiCrawler: BranchCrawler = {
        lang: "en",
        crawlerType: "api",
        fetchArticleList: () => Promise.resolve([]),
        fetchArticleContent: () => Promise.resolve(createMockArticleContent()),
        getLastModified: () => Promise.resolve(null),
      };

      const scrapingCrawler: BranchCrawler = {
        lang: "ja",
        crawlerType: "scraping",
        fetchArticleList: () => Promise.resolve([]),
        fetchArticleContent: () => Promise.resolve(createMockArticleContent()),
        getLastModified: () => Promise.resolve(null),
      };

      expect(apiCrawler.crawlerType).toBe("api");
      expect(scrapingCrawler.crawlerType).toBe("scraping");
    });

    it("fetchArticleListメソッドを持つ", () => {
      const mockCrawler: BranchCrawler = {
        lang: "en",
        crawlerType: "api",
        fetchArticleList: () =>
          Promise.resolve([
            {
              id: "SCP-173",
              title: "The Sculpture",
              url: "https://example.com/scp-173",
              series: "series-1",
            },
          ]),
        fetchArticleContent: () => Promise.resolve(createMockArticleContent()),
        getLastModified: () => Promise.resolve(null),
      };

      expect(typeof mockCrawler.fetchArticleList).toBe("function");
    });

    it("fetchArticleContentメソッドを持つ", () => {
      const mockCrawler: BranchCrawler = {
        lang: "en",
        crawlerType: "api",
        fetchArticleList: () => Promise.resolve([]),
        fetchArticleContent: (id: string) =>
          Promise.resolve(
            createMockArticleContent({
              id,
              title: "Test Article",
              content: "Content here",
              rating: 100,
              tags: ["safe"],
            })
          ),
        getLastModified: () => Promise.resolve(null),
      };

      expect(typeof mockCrawler.fetchArticleContent).toBe("function");
    });

    it("getLastModifiedメソッドを持つ", () => {
      const mockCrawler: BranchCrawler = {
        lang: "en",
        crawlerType: "api",
        fetchArticleList: () => Promise.resolve([]),
        fetchArticleContent: () => Promise.resolve(createMockArticleContent()),
        getLastModified: () => Promise.resolve(new Date("2024-01-01")),
      };

      expect(typeof mockCrawler.getLastModified).toBe("function");
    });
  });
});
