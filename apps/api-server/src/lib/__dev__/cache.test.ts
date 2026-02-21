/**
 * @file キャッシュヘルパー テスト
 * @description cacheGet / cacheSet のRedis有効/無効/エラー時の分岐テスト
 * @see specs/016-article-speed/016-01-redis-cache/016-01-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// loggerモジュールをモック
const mockLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  child: vi.fn(),
};
vi.mock("../logger", () => ({
  logger: mockLogger,
  createChildLogger: vi.fn(() => mockLogger),
}));

// Redisクライアントモック
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockGetRedisClient = vi.fn();

vi.mock("../redis", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  getRedisClient: () => mockGetRedisClient(),
}));

describe("cacheGet / cacheSet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("キャッシュにデータを保存して取得できる", async () => {
    const mockClient = { get: mockRedisGet, set: mockRedisSet };
    mockGetRedisClient.mockReturnValue(mockClient);
    mockRedisSet.mockResolvedValue("OK");
    mockRedisGet.mockResolvedValue({ title: "SCP-173", excerpt: "彫刻" });

    const { cacheGet, cacheSet } = await import("../cache");

    await cacheSet("test:key", { title: "SCP-173", excerpt: "彫刻" }, 3600);
    expect(mockRedisSet).toHaveBeenCalledWith(
      "test:key",
      { title: "SCP-173", excerpt: "彫刻" },
      { ex: 3600 }
    );

    const result = await cacheGet<{ title: string; excerpt: string }>("test:key");
    expect(result).toEqual({ title: "SCP-173", excerpt: "彫刻" });
  });

  it("キャッシュミス時はnullを返す", async () => {
    const mockClient = { get: mockRedisGet, set: mockRedisSet };
    mockGetRedisClient.mockReturnValue(mockClient);
    mockRedisGet.mockResolvedValue(null);

    const { cacheGet } = await import("../cache");
    const result = await cacheGet("nonexistent:key");

    expect(result).toBeNull();
  });

  it("Redisクライアントがnullの場合、cacheGetはnullを返す", async () => {
    mockGetRedisClient.mockReturnValue(null);

    const { cacheGet } = await import("../cache");
    const result = await cacheGet("test:key");

    expect(result).toBeNull();
    expect(mockRedisGet).not.toHaveBeenCalled();
  });

  it("Redisクライアントがnullの場合、cacheSetは何もしない", async () => {
    mockGetRedisClient.mockReturnValue(null);

    const { cacheSet } = await import("../cache");
    await cacheSet("test:key", "value", 3600);

    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it("Redisエラー時はログ出力してnullを返す", async () => {
    const mockClient = { get: mockRedisGet, set: mockRedisSet };
    mockGetRedisClient.mockReturnValue(mockClient);
    mockRedisGet.mockRejectedValue(new Error("Redis connection failed"));

    const { cacheGet } = await import("../cache");
    const result = await cacheGet("test:key");

    expect(result).toBeNull();
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it("cacheSetのRedisエラー時はログ出力して例外を伝播しない", async () => {
    const mockClient = { get: mockRedisGet, set: mockRedisSet };
    mockGetRedisClient.mockReturnValue(mockClient);
    mockRedisSet.mockRejectedValue(new Error("Redis write failed"));

    const { cacheSet } = await import("../cache");
    await expect(cacheSet("test:key", "value", 3600)).resolves.toBeUndefined();

    expect(mockLogger.error).toHaveBeenCalled();
  });
});
