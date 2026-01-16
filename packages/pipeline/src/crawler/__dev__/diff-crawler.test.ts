/**
 * 差分クローラーのテスト
 * Subtask: 003-02-03
 */

import { describe, it, expect, vi } from "vitest";
import { detectChanges, DiffCrawler } from "../diff-crawler";
import type { ArticleIndex, ArticleContent, DbArticle, BranchCrawler } from "../types";
import { computeContentHash } from "../utils/content-hash";

// モッククローラー
const createMockCrawler = (
  articles: ArticleIndex[],
  contents: Map<string, ArticleContent>
): BranchCrawler => ({
  lang: "en",
  crawlerType: "api" as const,
  fetchArticleList: vi.fn().mockResolvedValue(articles),
  fetchArticleContent: vi.fn().mockImplementation((id: string) => {
    const content = contents.get(id);
    if (!content) return Promise.reject(new Error(`記事が見つかりません: ${id}`));
    return Promise.resolve(content);
  }),
  getLastModified: vi.fn().mockImplementation((id: string) => {
    const content = contents.get(id);
    return Promise.resolve(content?.updatedAt ?? new Date("2024-01-01"));
  }),
});

// テスト用のDB記事を作成
const createDbArticle = (
  id: string,
  content: string,
  overrides?: Partial<DbArticle>
): DbArticle => ({
  article_id: id,
  lang: "en",
  title: `Title of ${id}`,
  content,
  rating: 100,
  tags: ["scp"],
  fetched_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  embedding_status: "completed",
  tagging_status: "completed",
  content_hash: computeContentHash(content),
  is_deleted: false,
  ...overrides,
});

// テスト用のAPI記事インデックスを作成
const createArticleIndex = (id: string): ArticleIndex => ({
  id,
  title: `Title of ${id}`,
  url: `https://scp-wiki.wikidot.com/${id.toLowerCase()}`,
  series: "series-1",
});

// テスト用のAPI記事コンテンツを作成
const createArticleContent = (
  id: string,
  content: string,
  overrides?: Partial<ArticleContent>
): ArticleContent => ({
  id,
  title: `Title of ${id}`,
  content,
  rating: 100,
  tags: ["scp"],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  sourceHash: computeContentHash(content),
  ...overrides,
});

describe("detectChanges", () => {
  it("DBにない記事を新規として検出する", () => {
    const apiArticles: ArticleIndex[] = [
      createArticleIndex("SCP-001"),
      createArticleIndex("SCP-002"),
      createArticleIndex("SCP-003"),
    ];
    const dbArticles: DbArticle[] = [createDbArticle("SCP-001", "既存のコンテンツ")];
    const dbArticleMap = new Map(dbArticles.map((a) => [a.article_id, a]));

    const result = detectChanges(apiArticles, dbArticleMap);

    expect(result.newArticleIds).toEqual(["SCP-002", "SCP-003"]);
    expect(result.updatedArticleIds).toEqual([]);
    expect(result.deletedArticleIds).toEqual([]);
    expect(result.unchangedArticleIds).toEqual(["SCP-001"]);
  });

  it("APIにない記事を削除対象として検出する", () => {
    const apiArticles: ArticleIndex[] = [createArticleIndex("SCP-001")];
    const dbArticles: DbArticle[] = [
      createDbArticle("SCP-001", "コンテンツ1"),
      createDbArticle("SCP-002", "コンテンツ2"),
      createDbArticle("SCP-003", "コンテンツ3"),
    ];
    const dbArticleMap = new Map(dbArticles.map((a) => [a.article_id, a]));

    const result = detectChanges(apiArticles, dbArticleMap);

    expect(result.newArticleIds).toEqual([]);
    expect(result.deletedArticleIds).toEqual(["SCP-002", "SCP-003"]);
    expect(result.unchangedArticleIds).toEqual(["SCP-001"]);
  });

  it("既に削除済みの記事は削除対象に含めない", () => {
    const apiArticles: ArticleIndex[] = [createArticleIndex("SCP-001")];
    const dbArticles: DbArticle[] = [
      createDbArticle("SCP-001", "コンテンツ1"),
      createDbArticle("SCP-002", "コンテンツ2", { is_deleted: true }),
    ];
    const dbArticleMap = new Map(dbArticles.map((a) => [a.article_id, a]));

    const result = detectChanges(apiArticles, dbArticleMap);

    expect(result.deletedArticleIds).toEqual([]);
  });

  it("空のDB・空のAPIでも正常に動作する", () => {
    const result = detectChanges([], new Map());

    expect(result.newArticleIds).toEqual([]);
    expect(result.updatedArticleIds).toEqual([]);
    expect(result.deletedArticleIds).toEqual([]);
    expect(result.unchangedArticleIds).toEqual([]);
  });

  it("全て新規の場合を正しく処理する", () => {
    const apiArticles: ArticleIndex[] = [
      createArticleIndex("SCP-001"),
      createArticleIndex("SCP-002"),
    ];

    const result = detectChanges(apiArticles, new Map());

    expect(result.newArticleIds).toEqual(["SCP-001", "SCP-002"]);
    expect(result.unchangedArticleIds).toEqual([]);
  });
});

describe("DiffCrawler", () => {
  describe("detectAndClassify", () => {
    it("コンテンツハッシュが異なる記事を更新対象として検出する", async () => {
      const oldContent = "古いコンテンツ";
      const newContent = "新しいコンテンツ";

      const apiArticles: ArticleIndex[] = [createArticleIndex("SCP-001")];
      const apiContents = new Map<string, ArticleContent>([
        ["SCP-001", createArticleContent("SCP-001", newContent)],
      ]);
      const dbArticles: DbArticle[] = [createDbArticle("SCP-001", oldContent)];

      const mockCrawler = createMockCrawler(apiArticles, apiContents);
      const mockDbOps = {
        fetchExistingArticles: vi.fn().mockResolvedValue(dbArticles),
        saveArticle: vi.fn().mockResolvedValue(undefined),
        updateArticle: vi.fn().mockResolvedValue(undefined),
        markAsDeleted: vi.fn().mockResolvedValue(undefined),
      };

      const diffCrawler = new DiffCrawler(mockCrawler, mockDbOps);
      const result = await diffCrawler.detectAndClassify();

      expect(result.updatedArticleIds).toContain("SCP-001");
    });

    it("コンテンツハッシュが同じ記事は変更なしとして分類する", async () => {
      const content = "同じコンテンツ";

      const apiArticles: ArticleIndex[] = [createArticleIndex("SCP-001")];
      const apiContents = new Map<string, ArticleContent>([
        ["SCP-001", createArticleContent("SCP-001", content)],
      ]);
      const dbArticles: DbArticle[] = [createDbArticle("SCP-001", content)];

      const mockCrawler = createMockCrawler(apiArticles, apiContents);
      const mockDbOps = {
        fetchExistingArticles: vi.fn().mockResolvedValue(dbArticles),
        saveArticle: vi.fn().mockResolvedValue(undefined),
        updateArticle: vi.fn().mockResolvedValue(undefined),
        markAsDeleted: vi.fn().mockResolvedValue(undefined),
      };

      const diffCrawler = new DiffCrawler(mockCrawler, mockDbOps);
      const result = await diffCrawler.detectAndClassify();

      expect(result.unchangedArticleIds).toContain("SCP-001");
      expect(result.updatedArticleIds).not.toContain("SCP-001");
    });
  });

  describe("run", () => {
    it("新規記事をDBに保存する", async () => {
      const apiArticles: ArticleIndex[] = [createArticleIndex("SCP-001")];
      const apiContents = new Map<string, ArticleContent>([
        ["SCP-001", createArticleContent("SCP-001", "新規コンテンツ")],
      ]);

      const mockCrawler = createMockCrawler(apiArticles, apiContents);
      const mockDbOps = {
        fetchExistingArticles: vi.fn().mockResolvedValue([]),
        saveArticle: vi.fn().mockResolvedValue(undefined),
        updateArticle: vi.fn().mockResolvedValue(undefined),
        markAsDeleted: vi.fn().mockResolvedValue(undefined),
      };

      const diffCrawler = new DiffCrawler(mockCrawler, mockDbOps);
      const result = await diffCrawler.run();

      expect(mockDbOps.saveArticle).toHaveBeenCalledTimes(1);
      expect(result.newCount).toBe(1);
    });

    it("更新記事のembedding_statusとtagging_statusをpendingにリセットする", async () => {
      const oldContent = "古いコンテンツ";
      const newContent = "新しいコンテンツ";

      const apiArticles: ArticleIndex[] = [createArticleIndex("SCP-001")];
      const apiContents = new Map<string, ArticleContent>([
        [
          "SCP-001",
          createArticleContent("SCP-001", newContent, {
            updatedAt: new Date("2024-01-02"), // 更新日時が変わっている
          }),
        ],
      ]);
      const dbArticles: DbArticle[] = [createDbArticle("SCP-001", oldContent)];

      const mockCrawler = createMockCrawler(apiArticles, apiContents);
      const mockDbOps = {
        fetchExistingArticles: vi.fn().mockResolvedValue(dbArticles),
        saveArticle: vi.fn().mockResolvedValue(undefined),
        updateArticle: vi.fn().mockResolvedValue(undefined),
        markAsDeleted: vi.fn().mockResolvedValue(undefined),
      };

      const diffCrawler = new DiffCrawler(mockCrawler, mockDbOps);
      await diffCrawler.run();

      expect(mockDbOps.updateArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "SCP-001",
          embedding_status: "pending",
          tagging_status: "pending",
        })
      );
    });

    it("削除された記事を論理削除する", async () => {
      const apiArticles: ArticleIndex[] = [];
      const apiContents = new Map<string, ArticleContent>();
      const dbArticles: DbArticle[] = [createDbArticle("SCP-001", "削除される記事")];

      const mockCrawler = createMockCrawler(apiArticles, apiContents);
      const mockDbOps = {
        fetchExistingArticles: vi.fn().mockResolvedValue(dbArticles),
        saveArticle: vi.fn().mockResolvedValue(undefined),
        updateArticle: vi.fn().mockResolvedValue(undefined),
        markAsDeleted: vi.fn().mockResolvedValue(undefined),
      };

      const diffCrawler = new DiffCrawler(mockCrawler, mockDbOps);
      const result = await diffCrawler.run();

      expect(mockDbOps.markAsDeleted).toHaveBeenCalledWith("SCP-001", "en");
      expect(result.deletedCount).toBe(1);
    });

    it("差分レポートに正しい統計情報が含まれる", async () => {
      const apiArticles: ArticleIndex[] = [
        createArticleIndex("SCP-001"), // 変更なし
        createArticleIndex("SCP-002"), // 新規
        createArticleIndex("SCP-003"), // 更新
      ];
      const apiContents = new Map<string, ArticleContent>([
        ["SCP-001", createArticleContent("SCP-001", "変更なし")],
        ["SCP-002", createArticleContent("SCP-002", "新規コンテンツ")],
        [
          "SCP-003",
          createArticleContent("SCP-003", "新しいコンテンツ", {
            updatedAt: new Date("2024-01-02"), // 更新日時が変わっている
          }),
        ],
      ]);
      const dbArticles: DbArticle[] = [
        createDbArticle("SCP-001", "変更なし"),
        createDbArticle("SCP-003", "古いコンテンツ"),
        createDbArticle("SCP-004", "削除される"),
      ];

      const mockCrawler = createMockCrawler(apiArticles, apiContents);
      const mockDbOps = {
        fetchExistingArticles: vi.fn().mockResolvedValue(dbArticles),
        saveArticle: vi.fn().mockResolvedValue(undefined),
        updateArticle: vi.fn().mockResolvedValue(undefined),
        markAsDeleted: vi.fn().mockResolvedValue(undefined),
      };

      const diffCrawler = new DiffCrawler(mockCrawler, mockDbOps);
      const result = await diffCrawler.run();

      expect(result.newCount).toBe(1); // SCP-002
      expect(result.updatedCount).toBe(1); // SCP-003
      expect(result.deletedCount).toBe(1); // SCP-004
      expect(result.unchangedCount).toBe(1); // SCP-001
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("dryRunモードではDBに保存しない", async () => {
      const apiArticles: ArticleIndex[] = [createArticleIndex("SCP-001")];
      const apiContents = new Map<string, ArticleContent>([
        ["SCP-001", createArticleContent("SCP-001", "新規")],
      ]);

      const mockCrawler = createMockCrawler(apiArticles, apiContents);
      const mockDbOps = {
        fetchExistingArticles: vi.fn().mockResolvedValue([]),
        saveArticle: vi.fn().mockResolvedValue(undefined),
        updateArticle: vi.fn().mockResolvedValue(undefined),
        markAsDeleted: vi.fn().mockResolvedValue(undefined),
      };

      const diffCrawler = new DiffCrawler(mockCrawler, mockDbOps);
      await diffCrawler.run({ dryRun: true });

      expect(mockDbOps.saveArticle).not.toHaveBeenCalled();
      expect(mockDbOps.updateArticle).not.toHaveBeenCalled();
      expect(mockDbOps.markAsDeleted).not.toHaveBeenCalled();
    });

    it("進捗コールバックが呼び出される", async () => {
      const apiArticles: ArticleIndex[] = [createArticleIndex("SCP-001")];
      const apiContents = new Map<string, ArticleContent>([
        ["SCP-001", createArticleContent("SCP-001", "コンテンツ")],
      ]);

      const mockCrawler = createMockCrawler(apiArticles, apiContents);
      const mockDbOps = {
        fetchExistingArticles: vi.fn().mockResolvedValue([]),
        saveArticle: vi.fn().mockResolvedValue(undefined),
        updateArticle: vi.fn().mockResolvedValue(undefined),
        markAsDeleted: vi.fn().mockResolvedValue(undefined),
      };

      const onProgress = vi.fn();
      const diffCrawler = new DiffCrawler(mockCrawler, mockDbOps);
      await diffCrawler.run({ onProgress });

      expect(onProgress).toHaveBeenCalled();
      const calls = onProgress.mock.calls as [{ phase: string }][];
      expect(calls.length).toBeGreaterThan(0);
      const phases = calls.map((call) => call[0].phase);
      expect(phases.some((phase) => ["detect", "fetch_new", "save"].includes(phase))).toBe(true);
    });

    it("本文取得は更新が必要な記事のみに限定する", async () => {
      const content = "同じコンテンツ";

      const apiArticles: ArticleIndex[] = [
        createArticleIndex("SCP-001"), // 変更なし
        createArticleIndex("SCP-002"), // 新規
      ];
      const apiContents = new Map<string, ArticleContent>([
        ["SCP-001", createArticleContent("SCP-001", content)],
        ["SCP-002", createArticleContent("SCP-002", "新規コンテンツ")],
      ]);
      const dbArticles: DbArticle[] = [createDbArticle("SCP-001", content)];

      const mockCrawler = createMockCrawler(apiArticles, apiContents);
      const mockDbOps = {
        fetchExistingArticles: vi.fn().mockResolvedValue(dbArticles),
        saveArticle: vi.fn().mockResolvedValue(undefined),
        updateArticle: vi.fn().mockResolvedValue(undefined),
        markAsDeleted: vi.fn().mockResolvedValue(undefined),
      };

      const diffCrawler = new DiffCrawler(mockCrawler, mockDbOps);
      await diffCrawler.run();

      // SCP-002（新規）のみ本文取得
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCrawler.fetchArticleContent).toHaveBeenCalledWith("SCP-002");
      // SCP-001（変更なし）は本文取得しない
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCrawler.fetchArticleContent).not.toHaveBeenCalledWith("SCP-001");
    });
  });
});
