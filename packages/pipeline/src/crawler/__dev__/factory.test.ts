/**
 * CrawlerFactoryのテスト
 * Subtask: 003-02-01
 */

import { describe, it, expect } from "vitest";
import { CrawlerFactory } from "../factory";
import { EnglishCrawler } from "../english-crawler";
import type { BranchCrawler } from "../types";

describe("CrawlerFactory", () => {
  describe("create", () => {
    it("'en'を指定するとEnglishCrawlerが返される", () => {
      const crawler = CrawlerFactory.create("en");

      expect(crawler).toBeInstanceOf(EnglishCrawler);
      expect(crawler.lang).toBe("en");
    });

    it("返されるクローラーはBranchCrawlerインターフェースを実装している", () => {
      const crawler = CrawlerFactory.create("en");

      // BranchCrawlerの必須プロパティ/メソッドを確認
      expect(crawler.lang).toBeDefined();
      expect(crawler.crawlerType).toBeDefined();
      expect(typeof crawler.fetchArticleList).toBe("function");
      expect(typeof crawler.fetchArticleContent).toBe("function");
      expect(typeof crawler.getLastModified).toBe("function");
    });

    it("未対応の言語を指定するとエラーがスローされる", () => {
      expect(() => CrawlerFactory.create("xx")).toThrow();
    });

    it("未対応言語のエラーメッセージに言語コードが含まれる", () => {
      expect(() => CrawlerFactory.create("fr")).toThrow(/fr/);
    });

    it("未対応言語のエラーメッセージにサポート言語一覧が含まれる", () => {
      expect(() => CrawlerFactory.create("ko")).toThrow(/en/);
    });
  });

  describe("getSupportedLanguages", () => {
    it("対応言語一覧を取得できる", () => {
      const languages = CrawlerFactory.getSupportedLanguages();

      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
    });

    it("'en'が対応言語に含まれる", () => {
      const languages = CrawlerFactory.getSupportedLanguages();

      expect(languages).toContain("en");
    });
  });

  describe("型安全性", () => {
    it("createの戻り値はBranchCrawler型", () => {
      const crawler: BranchCrawler = CrawlerFactory.create("en");

      // 型チェックのためのアサーション
      expect(crawler.lang).toBe("en");
      expect(["api", "scraping"]).toContain(crawler.crawlerType);
    });
  });
});
