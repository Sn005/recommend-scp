/**
 * @file URLチェックAPI テスト
 * @description 404検知用プロキシAPIのテスト
 * @see specs/010-ja-article-display/010-03-webview-ja/010-03-02.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { checkUrlRoutes } from "../check-url";

interface CheckUrlResponse {
  exists?: boolean;
  error?: string;
}

describe("GET /check-url", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("AC-1: 404検知", () => {
    it("存在するURLの場合、exists: true を返す", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

      const app = new Hono().route("/check-url", checkUrlRoutes);

      // Act
      const res = await app.request("/check-url?url=https://scp-jp.wikidot.com/scp-173");
      const data = (await res.json()) as CheckUrlResponse;

      // Assert
      expect(res.status).toBe(200);
      expect(data).toEqual({ exists: true });
      expect(global.fetch).toHaveBeenCalledWith("https://scp-jp.wikidot.com/scp-173", {
        method: "HEAD",
      });
    });

    it("404ページの場合、exists: false を返す", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

      const app = new Hono().route("/check-url", checkUrlRoutes);

      // Act
      const res = await app.request("/check-url?url=https://scp-jp.wikidot.com/scp-99999");
      const data = (await res.json()) as CheckUrlResponse;

      // Assert
      expect(res.status).toBe(200);
      expect(data).toEqual({ exists: false });
    });

    it("HEADが非404エラー（403等）を返す場合、GETでフォールバックして存在確認する", async () => {
      // Arrange: HEAD→403、GET→200
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 403 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const app = new Hono().route("/check-url", checkUrlRoutes);

      // Act
      const res = await app.request("/check-url?url=https://scp-jp.wikidot.com/scp-786");
      const data = (await res.json()) as CheckUrlResponse;

      // Assert
      expect(res.status).toBe(200);
      expect(data).toEqual({ exists: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(1, "https://scp-jp.wikidot.com/scp-786", {
        method: "HEAD",
      });
      expect(global.fetch).toHaveBeenNthCalledWith(2, "https://scp-jp.wikidot.com/scp-786", {
        method: "GET",
      });
    });

    it("HEADが405を返しGETが404を返す場合、exists: false を返す", async () => {
      // Arrange: HEAD→405、GET→404
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 405 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      const app = new Hono().route("/check-url", checkUrlRoutes);

      // Act
      const res = await app.request("/check-url?url=https://scp-jp.wikidot.com/scp-99999");
      const data = (await res.json()) as CheckUrlResponse;

      // Assert
      expect(res.status).toBe(200);
      expect(data).toEqual({ exists: false });
    });

    it("ネットワークエラーの場合、exists: true を返す（誤検知防止）", async () => {
      // Arrange
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const app = new Hono().route("/check-url", checkUrlRoutes);

      // Act
      const res = await app.request("/check-url?url=https://scp-jp.wikidot.com/scp-173");
      const data = (await res.json()) as CheckUrlResponse;

      // Assert
      expect(res.status).toBe(200);
      expect(data).toEqual({ exists: true });
    });
  });

  describe("バリデーション", () => {
    it("URLパラメータがない場合、400エラーを返す", async () => {
      // Arrange
      const app = new Hono().route("/check-url", checkUrlRoutes);

      // Act
      const res = await app.request("/check-url");
      const data = (await res.json()) as CheckUrlResponse;

      // Assert
      expect(res.status).toBe(400);
      expect(data).toEqual({ error: "url is required" });
    });

    it("URLパラメータが空文字の場合、400エラーを返す", async () => {
      // Arrange
      const app = new Hono().route("/check-url", checkUrlRoutes);

      // Act
      const res = await app.request("/check-url?url=");
      const data = (await res.json()) as CheckUrlResponse;

      // Assert
      expect(res.status).toBe(400);
      expect(data).toEqual({ error: "url is required" });
    });
  });

  describe("セキュリティ", () => {
    it("許可されたドメインのみアクセス可能", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const app = new Hono().route("/check-url", checkUrlRoutes);

      // Act
      const res = await app.request("/check-url?url=https://malicious-site.com/evil");
      const data = (await res.json()) as CheckUrlResponse;

      // Assert
      expect(res.status).toBe(400);
      expect(data).toEqual({ error: "Invalid domain" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("scp-jp.wikidot.comは許可される", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const app = new Hono().route("/check-url", checkUrlRoutes);

      // Act
      const res = await app.request("/check-url?url=http://scp-jp.wikidot.com/scp-173");

      // Assert
      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
