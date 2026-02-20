/**
 * フルクローラーのテスト
 * Subtask: 003-02-02
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FullCrawler } from "../full-crawler";
import type { ArticleContent, ArticleIndex, BranchCrawler, Checkpoint } from "../types";

// モックの作成
const createMockArticleList = (count: number): ArticleIndex[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `SCP-${String(i + 1).padStart(3, "0")}`,
    title: `Test Article ${String(i + 1)}`,
    url: `https://scp-wiki.wikidot.com/scp-${String(i + 1).padStart(3, "0")}`,
    series: `series-${String(Math.floor(i / 1000) + 1)}`,
  }));

const mockArticleContent = (id: string): ArticleContent => ({
  id,
  title: `Title for ${id}`,
  content: `Content for ${id}`,
  rating: 100,
  tags: ["test"],
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createMockCrawler = (articleCount = 150): BranchCrawler => ({
  lang: "en",
  crawlerType: "api",
  fetchArticleList: vi.fn().mockResolvedValue(createMockArticleList(articleCount)),
  fetchArticleContent: vi
    .fn()
    .mockImplementation((id: string) => Promise.resolve(mockArticleContent(id))),
  getLastModified: vi.fn().mockResolvedValue(new Date()),
});

describe("FullCrawler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("記事一覧取得", () => {
    it("記事一覧を取得できる", async () => {
      const mockCrawler = createMockCrawler();
      const crawler = new FullCrawler({ dryRun: true, crawler: mockCrawler });

      const promise = crawler.fetchAllArticles();
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.length).toBe(150);
      expect(mockCrawler.fetchArticleList).toHaveBeenCalled();
    });

    it("各記事にid, title, url, seriesが含まれる", async () => {
      const mockCrawler = createMockCrawler();
      const crawler = new FullCrawler({ dryRun: true, crawler: mockCrawler });

      const promise = crawler.fetchAllArticles();
      await vi.runAllTimersAsync();
      const result = await promise;

      result.forEach((article) => {
        expect(article).toHaveProperty("id");
        expect(article).toHaveProperty("title");
        expect(article).toHaveProperty("url");
        expect(article).toHaveProperty("series");
      });
    });
  });

  describe("フルクロール実行", () => {
    it("全記事をクロールできる（dryRun）", async () => {
      const mockCrawler = createMockCrawler(50);
      const crawler = new FullCrawler({ dryRun: true, crawler: mockCrawler });

      const promise = crawler.runFullCrawl();
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.successCount).toBe(50);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("進捗コールバックが呼ばれる", async () => {
      const onProgress = vi.fn();
      const mockCrawler = createMockCrawler(20);
      const crawler = new FullCrawler({
        dryRun: true,
        crawler: mockCrawler,
        onProgress,
      });

      const promise = crawler.runFullCrawl();
      await vi.runAllTimersAsync();
      await promise;

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: expect.any(String) as unknown as string,
          current: expect.any(Number) as unknown as number,
          total: expect.any(Number) as unknown as number,
        })
      );
    });
  });

  describe("チェックポイント", () => {
    it("100件ごとにチェックポイントコールバックが呼ばれる", async () => {
      const onCheckpoint = vi.fn();
      const mockCrawler = createMockCrawler(150);
      const crawler = new FullCrawler({
        dryRun: true,
        crawler: mockCrawler,
        checkpointInterval: 100,
        onCheckpoint,
      });

      const promise = crawler.runFullCrawl();
      await vi.runAllTimersAsync();
      await promise;

      expect(onCheckpoint).toHaveBeenCalled();
      expect(onCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          lastProcessedId: expect.any(String) as unknown as string,
          processedCount: 100,
          timestamp: expect.any(Date) as unknown as Date,
        })
      );
    });

    it("チェックポイントから再開できる", async () => {
      const checkpoint: Checkpoint = {
        lastProcessedId: "SCP-100",
        processedCount: 100,
        timestamp: new Date(),
      };

      const mockCrawler = createMockCrawler(150);
      const crawler = new FullCrawler({
        dryRun: true,
        crawler: mockCrawler,
        resumeFromCheckpoint: checkpoint,
      });

      const promise = crawler.runFullCrawl();
      await vi.runAllTimersAsync();
      const result = await promise;

      // 100件目以降から再開（101〜150で50件）
      expect(result.successCount).toBe(50);
    });
  });

  describe("レート制限", () => {
    it("バッチ間に遅延が挿入される", async () => {
      const mockCrawler = createMockCrawler(25);
      const crawler = new FullCrawler({
        dryRun: true,
        crawler: mockCrawler,
        batchSize: 10,
      });

      const startTime = Date.now();
      const promise = crawler.runFullCrawl();

      // 最初のバッチ
      await vi.advanceTimersByTimeAsync(0);

      // バッチ間の遅延を進める（25件 / 10件 = 3バッチ、2回の遅延）
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);

      await promise;

      // 少なくとも2秒（2バッチ分の遅延）が経過していることを確認
      expect(Date.now() - startTime).toBeGreaterThanOrEqual(2000);
    });
  });

  describe("リトライ", () => {
    it("一時的なエラー時にリトライする", async () => {
      let callCount = 0;
      const mockCrawler = createMockCrawler(10);

      vi.mocked(mockCrawler.fetchArticleContent).mockImplementation((id) => {
        if (id === "SCP-001") {
          callCount++;
          if (callCount < 3) {
            return Promise.reject(new Error("一時的エラー"));
          }
        }
        return Promise.resolve(mockArticleContent(id));
      });

      const crawler = new FullCrawler({ dryRun: true, crawler: mockCrawler });
      const promise = crawler.runFullCrawl();
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.successCount).toBe(10);
      expect(callCount).toBe(3); // 2回失敗 + 1回成功
    });
  });

  describe("エラーハンドリング", () => {
    it("失敗した記事がfailedIdsに含まれる", async () => {
      const mockCrawler = createMockCrawler(10);

      vi.mocked(mockCrawler.fetchArticleContent).mockImplementation((id) => {
        if (id === "SCP-005") {
          return Promise.reject(new Error("永続的エラー"));
        }
        return Promise.resolve(mockArticleContent(id));
      });

      const crawler = new FullCrawler({ dryRun: true, crawler: mockCrawler });
      const promise = crawler.runFullCrawl();
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.failedIds).toContain("SCP-005");
      expect(result.failedCount).toBe(1);
      expect(result.successCount).toBe(9);
    });
  });
});
