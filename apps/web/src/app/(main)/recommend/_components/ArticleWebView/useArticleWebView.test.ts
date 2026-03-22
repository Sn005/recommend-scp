import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useArticleWebView } from "./useArticleWebView";

type ScrollHandler = () => void;

/**
 * Mock iframeのcontentWindowを作成
 * デフォルト: scrollHeight=2000, innerHeight=800 → 最大スクロール量=1200
 */
function createMockIframe(options?: { scrollHeight?: number; innerHeight?: number }) {
  const scrollHeight = options?.scrollHeight ?? 2000;
  const innerHeight = options?.innerHeight ?? 800;
  const maxScroll = scrollHeight - innerHeight;

  let scrollHandler: ScrollHandler | null = null;

  const contentWindow = {
    scrollY: 0,
    innerHeight,
    document: {
      documentElement: { scrollHeight },
    },
    addEventListener: vi.fn((event: string, handler: ScrollHandler) => {
      if (event === "scroll") scrollHandler = handler;
    }),
    removeEventListener: vi.fn((event: string) => {
      if (event === "scroll") scrollHandler = null;
    }),
  };

  const element = { contentWindow } as unknown as HTMLIFrameElement;

  /**
   * 指定パーセンテージへのスクロールをシミュレート
   */
  const simulateScroll = (percentage: number) => {
    contentWindow.scrollY = (percentage / 100) * maxScroll;
    scrollHandler?.();
  };

  return { element, contentWindow, simulateScroll };
}

/**
 * hookを初期化してmock iframeを接続し、スクロール検知可能状態にするヘルパー
 */
function setupWithScrollTracking(hookOptions?: {
  url?: string;
  onScrollChange?: (p: number) => void;
  onScrollEnd?: () => void;
  scrollHeight?: number;
  innerHeight?: number;
}) {
  const result = renderHook(
    ({ url, onScrollChange, onScrollEnd }) =>
      useArticleWebView({ url, onScrollChange, onScrollEnd }),
    {
      initialProps: {
        url: hookOptions?.url ?? "https://example.com",
        onScrollChange: hookOptions?.onScrollChange,
        onScrollEnd: hookOptions?.onScrollEnd,
      },
    }
  );

  const mock = createMockIframe({
    scrollHeight: hookOptions?.scrollHeight,
    innerHeight: hookOptions?.innerHeight,
  });

  // iframeRefにモックを設定 + 読み込み完了でスクロール検知を有効化
  act(() => {
    (result.result.current.iframeRef as { current: HTMLIFrameElement | null }).current =
      mock.element;
    result.result.current.handleLoad();
  });

  return { ...result, mock };
}

describe("useArticleWebView", () => {
  beforeEach(() => {
    // requestAnimationFrameを同期実行にする（スクロールハンドラーのrAFスロットリング対応）
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    // モバイルビューポートに設定（iframe内スクロール検知を有効化するため）
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("AC-1: iframe表示", () => {
    it("初期状態でiframeRefが初期化される", () => {
      const { result } = renderHook(() =>
        useArticleWebView({ url: "https://scp-jp.wikidot.com/scp-173" })
      );

      expect(result.current.iframeRef).toBeDefined();
      expect(result.current.iframeRef.current).toBeNull();
    });
  });

  describe("AC-3: スクロール位置通知", () => {
    it("スクロール率0%で開始される", () => {
      const { result } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      expect(result.current.scrollPercentage).toBe(0);
    });

    it("スクロール時にonScrollChangeコールバックが呼び出される", () => {
      const onScrollChange = vi.fn();
      const { mock } = setupWithScrollTracking({ onScrollChange });

      act(() => {
        mock.simulateScroll(50);
      });

      expect(onScrollChange).toHaveBeenCalledWith(50);
    });

    it("スクロール率が更新される", () => {
      const { result, mock } = setupWithScrollTracking();

      act(() => {
        mock.simulateScroll(75);
      });

      expect(result.current.scrollPercentage).toBe(75);
    });
  });

  describe("AC-4: 記事切り替え", () => {
    it("URL変更後にスクロール率が0%にリセットされる", () => {
      const { result, rerender, mock } = setupWithScrollTracking({
        url: "https://example.com/article1",
      });

      act(() => {
        mock.simulateScroll(50);
      });
      expect(result.current.scrollPercentage).toBe(50);

      rerender({
        url: "https://example.com/article2",
        onScrollChange: undefined,
        onScrollEnd: undefined,
      });

      expect(result.current.scrollPercentage).toBe(0);
    });

    it("URL変更後にローディング状態がtrueになる", () => {
      const { result, rerender } = setupWithScrollTracking({
        url: "https://example.com/article1",
      });

      expect(result.current.isLoading).toBe(false);

      rerender({
        url: "https://example.com/article2",
        onScrollChange: undefined,
        onScrollEnd: undefined,
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("URL変更後に読了フラグがリセットされる", () => {
      const onScrollEnd = vi.fn();
      const { result, rerender, mock } = setupWithScrollTracking({
        url: "https://example.com/article1",
        onScrollEnd,
      });

      // 1記事目で90%到達
      act(() => {
        mock.simulateScroll(90);
      });
      expect(onScrollEnd).toHaveBeenCalledTimes(1);

      // URL変更
      rerender({
        url: "https://example.com/article2",
        onScrollChange: undefined,
        onScrollEnd,
      });

      // 2記事目用のmock iframeを設定
      const mock2 = createMockIframe();
      act(() => {
        (result.current.iframeRef as { current: HTMLIFrameElement | null }).current = mock2.element;
        result.current.handleLoad();
      });

      // 2記事目で90%到達
      act(() => {
        mock2.simulateScroll(90);
      });
      expect(onScrollEnd).toHaveBeenCalledTimes(2);
    });
  });

  describe("AC-5: ローディング状態", () => {
    it("初期状態でisLoadingがtrueになる", () => {
      const { result } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      expect(result.current.isLoading).toBe(true);
    });

    it("handleLoad呼び出し後にisLoadingがfalseになる", () => {
      const { result } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      act(() => {
        result.current.handleLoad();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("AC-6: 読了検知", () => {
    it("スクロール率90%到達時にonScrollEndが呼び出される", () => {
      const onScrollEnd = vi.fn();
      const { mock } = setupWithScrollTracking({ onScrollEnd });

      act(() => {
        mock.simulateScroll(90);
      });

      expect(onScrollEnd).toHaveBeenCalledTimes(1);
    });

    it("スクロール率89%ではonScrollEndが呼び出されない", () => {
      const onScrollEnd = vi.fn();
      const { mock } = setupWithScrollTracking({ onScrollEnd });

      act(() => {
        mock.simulateScroll(89);
      });

      expect(onScrollEnd).not.toHaveBeenCalled();
    });

    it("90%→80%→90%と戻った場合、onScrollEndが再度呼び出されない", () => {
      const onScrollEnd = vi.fn();
      const { mock } = setupWithScrollTracking({ onScrollEnd });

      act(() => {
        mock.simulateScroll(90);
      });
      expect(onScrollEnd).toHaveBeenCalledTimes(1);

      act(() => {
        mock.simulateScroll(80);
      });

      act(() => {
        mock.simulateScroll(90);
      });

      expect(onScrollEnd).toHaveBeenCalledTimes(1);
    });

    it("スクロール率100%でもonScrollEndが呼び出される", () => {
      const onScrollEnd = vi.fn();
      const { mock } = setupWithScrollTracking({ onScrollEnd });

      act(() => {
        mock.simulateScroll(100);
      });

      expect(onScrollEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe("AC-7: エラーハンドリング", () => {
    it("handleError呼び出し時にerrorステートが設定される", () => {
      const { result } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      expect(result.current.error).toBeNull();

      act(() => {
        result.current.handleError();
      });

      expect(result.current.error).not.toBeNull();
    });

    it("retry実行後にerrorステートがnullにリセットされる", () => {
      const { result } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      act(() => {
        result.current.handleError();
      });
      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.retry();
      });

      expect(result.current.error).toBeNull();
    });

    it("retry実行後にローディング状態がtrueになる", () => {
      const { result } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      act(() => {
        result.current.handleLoad();
        result.current.handleError();
      });
      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.retry();
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("エッジケース: コールバック未指定", () => {
    it("onScrollChangeが未指定でもスクロール時にエラーにならない", () => {
      const { mock } = setupWithScrollTracking();

      expect(() => {
        act(() => {
          mock.simulateScroll(50);
        });
      }).not.toThrow();
    });

    it("onScrollEndが未指定でも90%到達時にエラーにならない", () => {
      const { mock } = setupWithScrollTracking();

      expect(() => {
        act(() => {
          mock.simulateScroll(90);
        });
      }).not.toThrow();
    });
  });

  describe("エッジケース: 境界値", () => {
    it("スクロール率が負値相当の場合0として扱われる", () => {
      const onScrollChange = vi.fn();
      const { result, mock } = setupWithScrollTracking({ onScrollChange });

      act(() => {
        mock.simulateScroll(-10);
      });

      expect(result.current.scrollPercentage).toBe(0);
      expect(onScrollChange).toHaveBeenCalledWith(0);
    });

    it("スクロール率が100を超えた場合100として扱われる", () => {
      const onScrollChange = vi.fn();
      const { result, mock } = setupWithScrollTracking({ onScrollChange });

      act(() => {
        mock.simulateScroll(110);
      });

      expect(result.current.scrollPercentage).toBe(100);
      expect(onScrollChange).toHaveBeenCalledWith(100);
    });
  });

  describe("エッジケース: リソース解放", () => {
    it("コンポーネントアンマウント時にスクロールリスナーが解除される", () => {
      const { unmount, mock } = setupWithScrollTracking();

      unmount();

      expect(mock.contentWindow.removeEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function)
      );
    });
  });

  describe("エッジケース: iframe未ロード・コンテンツ不足", () => {
    it("iframe未ロード時はスクロール検知が無効", () => {
      const onScrollChange = vi.fn();
      const { result } = renderHook(() =>
        useArticleWebView({ url: "https://example.com", onScrollChange })
      );

      // iframeRefにモックを設定するが、handleLoadは呼ばない（isLoading=true）
      const mock = createMockIframe();
      (result.current.iframeRef as { current: HTMLIFrameElement | null }).current = mock.element;

      // addEventListenerが呼ばれていない（スクロール検知未開始）
      expect(mock.contentWindow.addEventListener).not.toHaveBeenCalled();
    });

    it("コンテンツがビューポートに収まる場合はスクロール率が更新されない", () => {
      const onScrollChange = vi.fn();
      // scrollHeight = innerHeight → スクロール不要
      const { mock } = setupWithScrollTracking({
        onScrollChange,
        scrollHeight: 800,
        innerHeight: 800,
      });

      act(() => {
        mock.simulateScroll(50);
      });

      expect(onScrollChange).not.toHaveBeenCalled();
    });
  });
});
