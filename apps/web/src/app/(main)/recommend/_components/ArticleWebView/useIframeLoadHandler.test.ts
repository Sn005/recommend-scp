/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIframeLoadHandler } from "./useIframeLoadHandler";
import type { RefObject } from "react";

// useArticleContentのモック
vi.mock("./useArticleContent", () => ({
  useArticleContent: vi.fn(),
}));

import { useArticleContent } from "./useArticleContent";
const mockUseArticleContent = vi.mocked(useArticleContent);

function createMockContainerRef(): RefObject<HTMLDivElement | null> {
  return {
    current: {
      style: { height: "" },
    } as unknown as HTMLDivElement,
  };
}

function createMockIframeRef(options?: { withImages?: boolean }) {
  const images = options?.withImages
    ? [
        {
          complete: false,
          addEventListener: vi.fn((_, cb: () => void) => {
            cb();
          }),
        },
      ]
    : [];

  const element = {
    contentDocument: {
      querySelectorAll: vi.fn(() => images),
    },
    style: { width: "" },
  } as unknown as HTMLIFrameElement;

  return { current: element };
}

describe("useIframeLoadHandler", () => {
  const mockFetchContent = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    mockUseArticleContent.mockReturnValue({
      fetchContent: mockFetchContent,
      isLoading: false,
    });

    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("初期状態", () => {
    it("handleIframeLoadが関数として返される", () => {
      const { result } = renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          isIframeLoading: true,
          iframeRef: { current: null },
          containerRef: { current: null },
          handleLoad: vi.fn(),
        })
      );

      expect(typeof result.current.handleIframeLoad).toBe("function");
    });
  });

  describe("handleIframeLoad", () => {
    it("handleLoad（親フック）を呼び出す", () => {
      const handleLoad = vi.fn();
      const { result } = renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          isIframeLoading: true,
          iframeRef: { current: null },
          containerRef: createMockContainerRef(),
          handleLoad,
        })
      );

      act(() => {
        result.current.handleIframeLoad();
      });

      expect(handleLoad).toHaveBeenCalledTimes(1);
    });

    it("onIframeLoadコールバックを呼び出す", () => {
      const onIframeLoad = vi.fn();
      const { result } = renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          isIframeLoading: true,
          iframeRef: { current: null },
          containerRef: createMockContainerRef(),
          handleLoad: vi.fn(),
          onIframeLoad,
        })
      );

      act(() => {
        result.current.handleIframeLoad();
      });

      expect(onIframeLoad).toHaveBeenCalledTimes(1);
    });

    it("containerのheightトグル（iOS Safariリフロー）を実行する", () => {
      const containerRef = createMockContainerRef();
      const { result } = renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          isIframeLoading: true,
          iframeRef: { current: null },
          containerRef,
          handleLoad: vi.fn(),
        })
      );

      act(() => {
        result.current.handleIframeLoad();
      });

      // rAFが同期実行されるため、最終的にheightが復元される
      expect(containerRef.current!.style.height).toBe("");
    });

    it("articleIdとonContentLoadedがある場合にfetchContentを呼び出す", () => {
      const onContentLoaded = vi.fn();
      const { result } = renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          articleId: "scp-173",
          isIframeLoading: true,
          iframeRef: { current: null },
          containerRef: createMockContainerRef(),
          handleLoad: vi.fn(),
          onContentLoaded,
        })
      );

      act(() => {
        result.current.handleIframeLoad();
      });

      expect(mockFetchContent).toHaveBeenCalledTimes(1);
    });

    it("articleIdがない場合にfetchContentを呼び出さない", () => {
      const onContentLoaded = vi.fn();
      const { result } = renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          isIframeLoading: true,
          iframeRef: { current: null },
          containerRef: createMockContainerRef(),
          handleLoad: vi.fn(),
          onContentLoaded,
        })
      );

      act(() => {
        result.current.handleIframeLoad();
      });

      expect(mockFetchContent).not.toHaveBeenCalled();
    });

    it("onContentLoadedがない場合にfetchContentを呼び出さない", () => {
      const { result } = renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          articleId: "scp-173",
          isIframeLoading: true,
          iframeRef: { current: null },
          containerRef: createMockContainerRef(),
          handleLoad: vi.fn(),
        })
      );

      act(() => {
        result.current.handleIframeLoad();
      });

      expect(mockFetchContent).not.toHaveBeenCalled();
    });

    it("2回呼び出してもfetchContentは1回のみ（重複防止）", () => {
      const onContentLoaded = vi.fn();
      const { result } = renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          articleId: "scp-173",
          isIframeLoading: true,
          iframeRef: { current: null },
          containerRef: createMockContainerRef(),
          handleLoad: vi.fn(),
          onContentLoaded,
        })
      );

      act(() => {
        result.current.handleIframeLoad();
      });
      act(() => {
        result.current.handleIframeLoad();
      });

      expect(mockFetchContent).toHaveBeenCalledTimes(1);
    });

    it("onContentFullyReady指定時にiframe画像読み込み完了後にコールバックされる", async () => {
      const onContentFullyReady = vi.fn();
      const iframeRef = createMockIframeRef();

      const { result } = renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          isIframeLoading: true,
          iframeRef,
          containerRef: createMockContainerRef(),
          handleLoad: vi.fn(),
          onContentFullyReady,
        })
      );

      await act(async () => {
        result.current.handleIframeLoad();
        // waitForIframeImages内部のPromiseを解決するためマイクロタスクをフラッシュ
        await Promise.resolve();
      });

      expect(onContentFullyReady).toHaveBeenCalledTimes(1);
    });
  });

  describe("プリロード昇格時のコンテンツ取得（Effect）", () => {
    it("isIframeLoading=false + articleId + onContentLoadedの条件でfetchContentが呼ばれる", () => {
      const onContentLoaded = vi.fn();

      renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          articleId: "scp-173",
          isIframeLoading: false,
          iframeRef: { current: null },
          containerRef: createMockContainerRef(),
          handleLoad: vi.fn(),
          onContentLoaded,
        })
      );

      expect(mockFetchContent).toHaveBeenCalledTimes(1);
    });

    it("isIframeLoading=trueの場合はfetchContentが呼ばれない", () => {
      const onContentLoaded = vi.fn();

      renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          articleId: "scp-173",
          isIframeLoading: true,
          iframeRef: { current: null },
          containerRef: createMockContainerRef(),
          handleLoad: vi.fn(),
          onContentLoaded,
        })
      );

      expect(mockFetchContent).not.toHaveBeenCalled();
    });

    it("articleIdがない場合はfetchContentが呼ばれない", () => {
      const onContentLoaded = vi.fn();

      renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          isIframeLoading: false,
          iframeRef: { current: null },
          containerRef: createMockContainerRef(),
          handleLoad: vi.fn(),
          onContentLoaded,
        })
      );

      expect(mockFetchContent).not.toHaveBeenCalled();
    });
  });

  describe("URL変更時のリセット", () => {
    it("URL変更後にisIframeLoadingがfalseに戻るとfetchContentが再度呼ばれる", () => {
      const onContentLoaded = vi.fn();

      const { rerender } = renderHook(
        ({ url, isIframeLoading }) =>
          useIframeLoadHandler({
            url,
            articleId: "scp-173",
            isIframeLoading,
            iframeRef: { current: null },
            containerRef: createMockContainerRef(),
            handleLoad: vi.fn(),
            onContentLoaded,
          }),
        { initialProps: { url: "https://example.com/1", isIframeLoading: false } }
      );

      expect(mockFetchContent).toHaveBeenCalledTimes(1);
      mockFetchContent.mockClear();

      // URL変更 + ローディング状態に戻る（新しいiframe読み込み開始）
      rerender({ url: "https://example.com/2", isIframeLoading: true });
      expect(mockFetchContent).not.toHaveBeenCalled();

      // iframe読み込み完了 → contentFetchedRefがリセット済みなので再度fetchContent
      rerender({ url: "https://example.com/2", isIframeLoading: false });
      expect(mockFetchContent).toHaveBeenCalledTimes(1);
    });
  });

  describe("useArticleContentへのパラメータ渡し", () => {
    it("articleIdがuseArticleContentに渡される", () => {
      renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          articleId: "scp-173",
          isIframeLoading: true,
          iframeRef: { current: null },
          containerRef: createMockContainerRef(),
          handleLoad: vi.fn(),
        })
      );

      expect(mockUseArticleContent).toHaveBeenCalledWith(
        expect.objectContaining({ articleId: "scp-173" })
      );
    });

    it("articleId未指定時に空文字列が渡される", () => {
      renderHook(() =>
        useIframeLoadHandler({
          url: "https://example.com",
          isIframeLoading: true,
          iframeRef: { current: null },
          containerRef: createMockContainerRef(),
          handleLoad: vi.fn(),
        })
      );

      expect(mockUseArticleContent).toHaveBeenCalledWith(
        expect.objectContaining({ articleId: "" })
      );
    });
  });
});
