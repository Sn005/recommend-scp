/**
 * @file ArticlesService.getContent キャッシュ テスト
 * @description getContentのRedisキャッシュ動作テスト
 * @see specs/016-article-speed/016-01-redis-cache/016-01-03.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ArticlesService } from "../service";
import type { ArticlesRepository } from "../repository";

// openaiモジュールをモック
vi.mock("../../../lib/openai", () => ({
  createEmbedding: vi.fn(),
}));

// cacheヘルパーをモック
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
vi.mock("../../../lib/cache", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  cacheGet: (...args: unknown[]) => mockCacheGet(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  cacheSet: (...args: unknown[]) => mockCacheSet(...args),
}));

describe("ArticlesService.getContent キャッシュ", () => {
  let service: ArticlesService;
  let mockRepository: {
    searchByEmbedding: ReturnType<typeof vi.fn>;
    getArticleById: ReturnType<typeof vi.fn>;
    getAuthorByArticleId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
    mockRepository = {
      searchByEmbedding: vi.fn(),
      getArticleById: vi.fn(),
      getAuthorByArticleId: vi.fn().mockResolvedValue("著者名"),
    };
    service = new ArticlesService(mockRepository as unknown as ArticlesRepository);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        text: vi
          .fn()
          .mockResolvedValue(
            '<html><div id="page-title">SCP-173</div><div id="page-content">彫刻のような生物。</div></html>'
          ),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("キャッシュヒット時は外部fetchとDB問い合わせを呼ばずキャッシュから返す", async () => {
    const cachedResult = { title: "SCP-173", excerpt: "彫刻のような生物。", author: "著者名" };
    mockCacheGet.mockResolvedValue(cachedResult);

    const result = await service.getContent("scp-173");

    expect(result).toEqual(cachedResult);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockRepository.getAuthorByArticleId).not.toHaveBeenCalled();
    expect(mockCacheGet).toHaveBeenCalledWith("article:content:scp-173");
  });

  it("キャッシュミス時は外部fetchしてキャッシュに保存する", async () => {
    const result = await service.getContent("scp-173");

    expect(result.title).toBe("SCP-173");
    expect(global.fetch).toHaveBeenCalled();
    expect(mockCacheSet).toHaveBeenCalledWith(
      "article:content:scp-173",
      expect.objectContaining({ title: "SCP-173" }),
      3600
    );
  });

  it("外部fetch失敗時はキャッシュに保存しない", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    mockRepository.getAuthorByArticleId.mockResolvedValue("");

    const result = await service.getContent("scp-173");

    expect(result).toEqual({ title: "", excerpt: "", author: "" });
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  it("Redis未設定時は既存動作と同一の振る舞いをする", async () => {
    // cacheGet returns null (Redis disabled)
    mockCacheGet.mockResolvedValue(null);

    const result = await service.getContent("scp-173");

    expect(result.title).toBe("SCP-173");
    expect(global.fetch).toHaveBeenCalled();
  });

  it("空レスポンス（title/excerptが空文字列）はキャッシュしない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue("<html><body>no content</body></html>"),
      })
    );
    mockRepository.getAuthorByArticleId.mockResolvedValue("");

    const result = await service.getContent("nonexistent-page");

    expect(result.title).toBe("");
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  it("キャッシュキーはarticleIdの小文字正規化を使用する", async () => {
    mockCacheGet.mockResolvedValue({ title: "SCP-173", excerpt: "cached", author: "author" });

    await service.getContent("SCP-173");

    expect(mockCacheGet).toHaveBeenCalledWith("article:content:scp-173");
  });
});
