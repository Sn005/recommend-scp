/**
 * @file Redisクライアント テスト
 * @description getRedisClient の環境変数分岐テスト
 * @see specs/016-article-speed/016-01-redis-cache/016-01-01.md
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// envモジュールをモック
const mockEnv: Record<string, string | undefined> = {};
vi.mock("@recommend-scp/shared/lib/env", () => ({
  env: new Proxy(
    {},
    {
      get: (_target, prop: string) => mockEnv[prop],
    }
  ),
}));

// @upstash/redis モジュールをモック（classパターンで既存テストに準拠）
const constructorArgs: Record<string, string>[] = [];
vi.mock("@upstash/redis", () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  Redis: class MockRedis {
    constructor(config: Record<string, string>) {
      constructorArgs.push(config);
    }
  },
}));

describe("getRedisClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    constructorArgs.length = 0;
    mockEnv.UPSTASH_REDIS_REST_URL = undefined;
    mockEnv.UPSTASH_REDIS_REST_TOKEN = undefined;
  });

  it("環境変数が設定されている場合はRedisインスタンスを返す", async () => {
    mockEnv.UPSTASH_REDIS_REST_URL = "https://test-redis.upstash.io";
    mockEnv.UPSTASH_REDIS_REST_TOKEN = "test-token-123";

    const { getRedisClient } = await import("../redis");
    const client = getRedisClient();

    expect(client).not.toBeNull();
    expect(constructorArgs).toEqual([
      {
        url: "https://test-redis.upstash.io",
        token: "test-token-123",
      },
    ]);
  });

  it("UPSTASH_REDIS_REST_URLが未設定の場合はnullを返す", async () => {
    mockEnv.UPSTASH_REDIS_REST_URL = undefined;
    mockEnv.UPSTASH_REDIS_REST_TOKEN = "test-token-123";

    const { getRedisClient } = await import("../redis");
    const client = getRedisClient();

    expect(client).toBeNull();
    expect(constructorArgs).toHaveLength(0);
  });

  it("UPSTASH_REDIS_REST_TOKENが未設定の場合はnullを返す", async () => {
    mockEnv.UPSTASH_REDIS_REST_URL = "https://test-redis.upstash.io";
    mockEnv.UPSTASH_REDIS_REST_TOKEN = undefined;

    const { getRedisClient } = await import("../redis");
    const client = getRedisClient();

    expect(client).toBeNull();
    expect(constructorArgs).toHaveLength(0);
  });
});
