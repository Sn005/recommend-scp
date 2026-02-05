/**
 * @file use404Detectionフック テスト
 * @description 404検知フックのユニットテスト
 * @see specs/010-ja-article-display/010-03-webview-ja/010-03-02.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { use404Detection } from "./use404Detection";

describe("use404Detection", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("AC-1: 404検知", () => {
    it("URLが404の場合、isNotFoundがtrueになる", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: false }),
      });

      const onNotFound = vi.fn();

      // Act
      const { result } = renderHook(() =>
        use404Detection({ url: "https://scp-jp.wikidot.com/scp-99999", onNotFound })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });
      expect(result.current.isNotFound).toBe(true);
      expect(onNotFound).toHaveBeenCalledTimes(1);
    });

    it("URLが存在する場合、isNotFoundがfalseになる", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true }),
      });

      const onNotFound = vi.fn();

      // Act
      const { result } = renderHook(() =>
        use404Detection({ url: "https://scp-jp.wikidot.com/scp-173", onNotFound })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });
      expect(result.current.isNotFound).toBe(false);
      expect(onNotFound).not.toHaveBeenCalled();
    });

    it("ネットワークエラー時、404として扱わない", async () => {
      // Arrange
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const onNotFound = vi.fn();

      // Act
      const { result } = renderHook(() =>
        use404Detection({ url: "https://scp-jp.wikidot.com/scp-173", onNotFound })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });
      expect(result.current.isNotFound).toBe(false);
      expect(onNotFound).not.toHaveBeenCalled();
    });

    it("空URLの場合、翻訳なしとして扱う", async () => {
      // Arrange
      global.fetch = vi.fn();
      const onNotFound = vi.fn();

      // Act
      const { result } = renderHook(() => use404Detection({ url: "", onNotFound }));

      // Assert
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });
      expect(result.current.isNotFound).toBe(true);
      expect(onNotFound).toHaveBeenCalledTimes(1);
      // fetchは呼ばれない
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("ローディング状態", () => {
    it("初期状態でisCheckingがtrueになる", () => {
      // Arrange
      global.fetch = vi.fn().mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        () => new Promise(() => {}) // 永続的にペンディング
      );

      // Act
      const { result } = renderHook(() =>
        use404Detection({ url: "https://scp-jp.wikidot.com/scp-173", onNotFound: vi.fn() })
      );

      // Assert
      expect(result.current.isChecking).toBe(true);
    });

    it("チェック完了後にisCheckingがfalseになる", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true }),
      });

      // Act
      const { result } = renderHook(() =>
        use404Detection({ url: "https://scp-jp.wikidot.com/scp-173", onNotFound: vi.fn() })
      );

      // Assert
      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });
    });
  });

  describe("URL変更時の挙動", () => {
    it("URL変更時に再チェックが実行される", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true }),
      });

      const onNotFound = vi.fn();

      // Act
      const { result, rerender } = renderHook(({ url }) => use404Detection({ url, onNotFound }), {
        initialProps: { url: "https://scp-jp.wikidot.com/scp-173" },
      });

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // URL変更
      rerender({ url: "https://scp-jp.wikidot.com/scp-999" });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it("URL変更時にisNotFoundがリセットされる", async () => {
      // Arrange
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ exists: false }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ exists: true }),
        });
      global.fetch = fetchMock;

      const onNotFound = vi.fn();

      // Act
      const { result, rerender } = renderHook(({ url }) => use404Detection({ url, onNotFound }), {
        initialProps: { url: "https://scp-jp.wikidot.com/scp-99999" },
      });

      await waitFor(() => {
        expect(result.current.isNotFound).toBe(true);
      });

      // URL変更
      rerender({ url: "https://scp-jp.wikidot.com/scp-173" });

      await waitFor(() => {
        expect(result.current.isNotFound).toBe(false);
      });
    });
  });

  describe("APIエンドポイント", () => {
    it("正しいAPIエンドポイントが呼ばれる", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exists: true }),
      });

      // Act
      renderHook(() =>
        use404Detection({
          url: "https://scp-jp.wikidot.com/scp-173",
          onNotFound: vi.fn(),
        })
      );

      // Assert
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/check-url?url=https%3A%2F%2Fscp-jp.wikidot.com%2Fscp-173",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest matcher
          expect.objectContaining({ signal: expect.any(AbortSignal) })
        );
      });
    });
  });
});
