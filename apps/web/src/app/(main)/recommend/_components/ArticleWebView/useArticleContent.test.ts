/**
 * @file useArticleContent フックのテスト
 * @see specs/010-ja-article-display/010-03-webview-ja/010-03-03.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useArticleContent } from "./useArticleContent";

describe("useArticleContent", () => {
  const mockOnContentLoaded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchContent", () => {
    it("記事IDに対応するコンテンツAPIを呼び出す", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ title: "テストタイトル", excerpt: "テスト本文冒頭" }),
      });

      const { result } = renderHook(() =>
        useArticleContent({
          articleId: "scp-173",
          onContentLoaded: mockOnContentLoaded,
        })
      );

      await act(async () => {
        await result.current.fetchContent();
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/articles/scp-173/content");
    });

    it("タイトルと本文冒頭50文字を取得できる", async () => {
      const mockContent = {
        title: "アイテム番号: SCP-173",
        excerpt: "SCP-173は、鋼筋コンクリートと鉄筋のスタチュです。物体はきわめて敵対的で",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContent),
      });

      const { result } = renderHook(() =>
        useArticleContent({
          articleId: "scp-173",
          onContentLoaded: mockOnContentLoaded,
        })
      );

      await act(async () => {
        await result.current.fetchContent();
      });

      expect(mockOnContentLoaded).toHaveBeenCalledWith(mockContent);
    });

    it("コンテンツ取得中はisLoadingがtrueになる", async () => {
      // Promise resolverを保持（即座に代入されることが保証される）
      let resolvePromise!: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() =>
        useArticleContent({
          articleId: "scp-173",
          onContentLoaded: mockOnContentLoaded,
        })
      );

      expect(result.current.isLoading).toBe(false);

      act(() => {
        void result.current.fetchContent();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      act(() => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ title: "", excerpt: "" }),
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("タイトルまたは本文が空の場合でもonContentLoadedが呼ばれる（フォールバック用）", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ title: "", excerpt: "" }),
      });

      const { result } = renderHook(() =>
        useArticleContent({
          articleId: "scp-999",
          onContentLoaded: mockOnContentLoaded,
        })
      );

      await act(async () => {
        await result.current.fetchContent();
      });

      expect(mockOnContentLoaded).toHaveBeenCalledWith({ title: "", excerpt: "" });
    });
  });

  describe("エラーハンドリング", () => {
    it("API呼び出し失敗時はサイレントに失敗する（エラーをスローしない）", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useArticleContent({
          articleId: "scp-173",
          onContentLoaded: mockOnContentLoaded,
        })
      );

      // エラーがスローされないことを確認
      await expect(
        act(async () => {
          await result.current.fetchContent();
        })
      ).resolves.not.toThrow();

      expect(mockOnContentLoaded).toHaveBeenCalledWith({ title: "", excerpt: "" });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("エラー後もisLoadingがfalseに戻る", async () => {
      vi.spyOn(console, "error").mockImplementation(vi.fn());

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useArticleContent({
          articleId: "scp-173",
          onContentLoaded: mockOnContentLoaded,
        })
      );

      await act(async () => {
        await result.current.fetchContent();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("articleIdの変更", () => {
    it("articleIdが変わると新しいAPIエンドポイントを呼び出す", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ title: "タイトル", excerpt: "本文" }),
      });

      const { result, rerender } = renderHook(
        ({ articleId }) =>
          useArticleContent({
            articleId,
            onContentLoaded: mockOnContentLoaded,
          }),
        { initialProps: { articleId: "scp-173" } }
      );

      await act(async () => {
        await result.current.fetchContent();
      });

      expect(global.fetch).toHaveBeenLastCalledWith("/api/articles/scp-173/content");

      rerender({ articleId: "scp-682" });

      await act(async () => {
        await result.current.fetchContent();
      });

      expect(global.fetch).toHaveBeenLastCalledWith("/api/articles/scp-682/content");
    });
  });
});
