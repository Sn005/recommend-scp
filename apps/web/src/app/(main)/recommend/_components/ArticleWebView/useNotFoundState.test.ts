/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotFoundState } from "./useNotFoundState";

// use404Detectionのモック
vi.mock("./use404Detection", () => ({
  use404Detection: vi.fn(),
}));

import { use404Detection } from "./use404Detection";
const mockUse404Detection = vi.mocked(use404Detection);

describe("useNotFoundState", () => {
  beforeEach(() => {
    mockUse404Detection.mockReturnValue({
      isChecking: false,
      isNotFound: false,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }))
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("初期状態", () => {
    it("showNotFoundがfalseで初期化される", () => {
      const { result } = renderHook(() => useNotFoundState({ url: "https://example.com" }));

      expect(result.current.showNotFound).toBe(false);
    });

    it("handleSuggestが関数として返される", () => {
      const { result } = renderHook(() => useNotFoundState({ url: "https://example.com" }));

      expect(typeof result.current.handleSuggest).toBe("function");
    });
  });

  describe("URL変更時のリセット", () => {
    it("URL変更時にshowNotFoundがfalseにリセットされる", async () => {
      let capturedOnNotFound: (() => void | Promise<void>) | undefined;
      mockUse404Detection.mockImplementation(({ onNotFound }) => {
        capturedOnNotFound = onNotFound;
        return { isChecking: false, isNotFound: false };
      });

      const { result, rerender } = renderHook(({ url }) => useNotFoundState({ url }), {
        initialProps: { url: "https://example.com/1" },
      });

      // 404を検知してshowNotFound=trueにする
      await act(async () => {
        await capturedOnNotFound?.();
      });
      expect(result.current.showNotFound).toBe(true);

      // URL変更
      rerender({ url: "https://example.com/2" });
      expect(result.current.showNotFound).toBe(false);
    });
  });

  describe("404検知", () => {
    it("use404Detectionにurl/onNotFoundが渡される", () => {
      renderHook(() => useNotFoundState({ url: "https://example.com" }));

      expect(mockUse404Detection).toHaveBeenCalledWith({
        url: "https://example.com",
        onNotFound: expect.any(Function),
      });
    });

    it("onNotFound呼び出しでshowNotFoundがtrueになる", async () => {
      let capturedOnNotFound: (() => void | Promise<void>) | undefined;
      mockUse404Detection.mockImplementation(({ onNotFound }) => {
        capturedOnNotFound = onNotFound;
        return { isChecking: false, isNotFound: false };
      });

      const { result } = renderHook(() =>
        useNotFoundState({ url: "https://example.com", articleId: "scp-173" })
      );

      await act(async () => {
        await capturedOnNotFound?.();
      });

      expect(result.current.showNotFound).toBe(true);
    });

    it("articleIdがある場合にDB更新APIが呼ばれる", async () => {
      const mockFetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }));
      vi.stubGlobal("fetch", mockFetch);

      let capturedOnNotFound: (() => void | Promise<void>) | undefined;
      mockUse404Detection.mockImplementation(({ onNotFound }) => {
        capturedOnNotFound = onNotFound;
        return { isChecking: false, isNotFound: false };
      });

      renderHook(() => useNotFoundState({ url: "https://example.com", articleId: "scp-173" }));

      await act(async () => {
        await capturedOnNotFound?.();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/articles/scp-173/translation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: "ja", hasTranslation: false }),
      });
    });

    it("articleIdがない場合にDB更新APIが呼ばれない", async () => {
      const mockFetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }));
      vi.stubGlobal("fetch", mockFetch);

      let capturedOnNotFound: (() => void | Promise<void>) | undefined;
      mockUse404Detection.mockImplementation(({ onNotFound }) => {
        capturedOnNotFound = onNotFound;
        return { isChecking: false, isNotFound: false };
      });

      renderHook(() => useNotFoundState({ url: "https://example.com" }));

      await act(async () => {
        await capturedOnNotFound?.();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("DB更新APIが失敗してもshowNotFoundはtrueになる", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(new Error("Network error")))
      );

      let capturedOnNotFound: (() => void | Promise<void>) | undefined;
      mockUse404Detection.mockImplementation(({ onNotFound }) => {
        capturedOnNotFound = onNotFound;
        return { isChecking: false, isNotFound: false };
      });

      const { result } = renderHook(() =>
        useNotFoundState({ url: "https://example.com", articleId: "scp-173" })
      );

      await act(async () => {
        await capturedOnNotFound?.();
      });

      expect(result.current.showNotFound).toBe(true);
    });
  });

  describe("handleSuggest", () => {
    it("handleSuggest呼び出しでshowNotFoundがfalseになる", async () => {
      let capturedOnNotFound: (() => void | Promise<void>) | undefined;
      mockUse404Detection.mockImplementation(({ onNotFound }) => {
        capturedOnNotFound = onNotFound;
        return { isChecking: false, isNotFound: false };
      });

      const { result } = renderHook(() => useNotFoundState({ url: "https://example.com" }));

      // まず404検知でshowNotFound=trueにする
      await act(async () => {
        await capturedOnNotFound?.();
      });
      expect(result.current.showNotFound).toBe(true);

      // handleSuggestでfalseに戻る
      act(() => {
        result.current.handleSuggest();
      });
      expect(result.current.showNotFound).toBe(false);
    });

    it("handleSuggest呼び出しでonSkipコールバックが呼ばれる", () => {
      const onSkip = vi.fn();
      const { result } = renderHook(() => useNotFoundState({ url: "https://example.com", onSkip }));

      act(() => {
        result.current.handleSuggest();
      });

      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it("onSkipが未指定でもhandleSuggestがエラーにならない", () => {
      const { result } = renderHook(() => useNotFoundState({ url: "https://example.com" }));

      expect(() => {
        act(() => {
          result.current.handleSuggest();
        });
      }).not.toThrow();
    });
  });
});
