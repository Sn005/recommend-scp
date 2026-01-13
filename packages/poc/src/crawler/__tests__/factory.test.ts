/**
 * CrawlerFactoryのテスト
 */
import { describe, it, expect } from "vitest";
import { CrawlerFactory } from "../factory";
import { EnglishCrawler } from "../english-crawler";

describe("CrawlerFactory", () => {
  describe("WHEN クローラーインスタンスを取得する際", () => {
    describe("GIVEN 言語コード'en'が指定された場合", () => {
      it("EnglishCrawlerインスタンスが返される", () => {
        const crawler = CrawlerFactory.create("en");

        expect(crawler).toBeDefined();
        expect(crawler.lang).toBe("en");
        expect(crawler).toBeInstanceOf(EnglishCrawler);
      });

      it("crawlerTypeが'api'である", () => {
        const crawler = CrawlerFactory.create("en");
        expect(crawler.crawlerType).toBe("api");
      });
    });
  });

  describe("WHEN 未対応の言語が指定された際", () => {
    it("未対応言語でエラーがスローされる", () => {
      expect(() => CrawlerFactory.create("xx")).toThrow();
    });

    it("エラーメッセージに未対応言語が含まれる", () => {
      expect(() => CrawlerFactory.create("fr")).toThrow(/fr/);
      expect(() => CrawlerFactory.create("ja")).toThrow(/ja/);
    });

    it("エラーメッセージに対応言語一覧が含まれる", () => {
      expect(() => CrawlerFactory.create("xx")).toThrow(/en/);
    });
  });

  describe("エッジケース", () => {
    it("空文字列でエラーがスローされる", () => {
      expect(() => CrawlerFactory.create("")).toThrow(/Unsupported language/);
    });
  });

  describe("getSupportedLanguages", () => {
    it("対応言語一覧が取得できる", () => {
      const languages = CrawlerFactory.getSupportedLanguages();

      expect(languages).toBeInstanceOf(Array);
      expect(languages).toContain("en");
    });
  });
});
