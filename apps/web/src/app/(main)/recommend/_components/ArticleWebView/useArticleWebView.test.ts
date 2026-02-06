import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useArticleWebView } from "./useArticleWebView";

// テスト用の許可されたorigin
const VALID_ORIGIN = "https://scp-jp.wikidot.com";

/**
 * 有効なoriginを持つスクロールメッセージを発行するヘルパー
 */
function dispatchScrollMessage(percentage: number): void {
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: VALID_ORIGIN,
      data: { type: "scroll", percentage },
    })
  );
}

/**
 * 不正なorigin（テスト用）を持つスクロールメッセージを発行するヘルパー
 */
function dispatchScrollMessageWithInvalidOrigin(percentage: number): void {
  window.dispatchEvent(
    new MessageEvent("message", {
      origin: "https://malicious-site.com",
      data: { type: "scroll", percentage },
    })
  );
}

describe("useArticleWebView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
      renderHook(() =>
        useArticleWebView({
          url: "https://example.com",
          onScrollChange,
        })
      );

      act(() => {
        dispatchScrollMessage(50);
      });

      expect(onScrollChange).toHaveBeenCalledWith(50);
    });

    it("スクロール率が更新される", () => {
      const { result } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      act(() => {
        dispatchScrollMessage(75);
      });

      expect(result.current.scrollPercentage).toBe(75);
    });
  });

  describe("AC-4: 記事切り替え", () => {
    it("URL変更後にスクロール率が0%にリセットされる", () => {
      const { result, rerender } = renderHook(({ url }) => useArticleWebView({ url }), {
        initialProps: { url: "https://example.com/article1" },
      });

      // スクロール発生
      act(() => {
        dispatchScrollMessage(50);
      });

      expect(result.current.scrollPercentage).toBe(50);

      // URL変更
      rerender({ url: "https://example.com/article2" });

      expect(result.current.scrollPercentage).toBe(0);
    });

    it("URL変更後にローディング状態がtrueになる", () => {
      const { result, rerender } = renderHook(({ url }) => useArticleWebView({ url }), {
        initialProps: { url: "https://example.com/article1" },
      });

      // ローディング完了
      act(() => {
        result.current.handleLoad();
      });
      expect(result.current.isLoading).toBe(false);

      // URL変更
      rerender({ url: "https://example.com/article2" });

      expect(result.current.isLoading).toBe(true);
    });

    it("URL変更後に読了フラグがリセットされる", () => {
      const onScrollEnd = vi.fn();
      const { rerender } = renderHook(({ url }) => useArticleWebView({ url, onScrollEnd }), {
        initialProps: { url: "https://example.com/article1" },
      });

      // 90%到達
      act(() => {
        dispatchScrollMessage(90);
      });

      expect(onScrollEnd).toHaveBeenCalledTimes(1);

      // URL変更
      rerender({ url: "https://example.com/article2" });

      // 新しい記事で90%到達
      act(() => {
        dispatchScrollMessage(90);
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
      renderHook(() =>
        useArticleWebView({
          url: "https://example.com",
          onScrollEnd,
        })
      );

      act(() => {
        dispatchScrollMessage(90);
      });

      expect(onScrollEnd).toHaveBeenCalledTimes(1);
    });

    it("スクロール率89%ではonScrollEndが呼び出されない", () => {
      const onScrollEnd = vi.fn();
      renderHook(() =>
        useArticleWebView({
          url: "https://example.com",
          onScrollEnd,
        })
      );

      act(() => {
        dispatchScrollMessage(89);
      });

      expect(onScrollEnd).not.toHaveBeenCalled();
    });

    it("90%→80%→90%と戻った場合、onScrollEndが再度呼び出されない", () => {
      const onScrollEnd = vi.fn();
      renderHook(() =>
        useArticleWebView({
          url: "https://example.com",
          onScrollEnd,
        })
      );

      // 90%到達
      act(() => {
        dispatchScrollMessage(90);
      });

      expect(onScrollEnd).toHaveBeenCalledTimes(1);

      // 80%に戻る
      act(() => {
        dispatchScrollMessage(80);
      });

      // 再度90%
      act(() => {
        dispatchScrollMessage(90);
      });

      expect(onScrollEnd).toHaveBeenCalledTimes(1);
    });

    it("スクロール率100%でもonScrollEndが呼び出される", () => {
      const onScrollEnd = vi.fn();
      renderHook(() =>
        useArticleWebView({
          url: "https://example.com",
          onScrollEnd,
        })
      );

      act(() => {
        dispatchScrollMessage(100);
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

      // ローディング完了 → エラー発生
      act(() => {
        result.current.handleLoad();
        result.current.handleError();
      });
      expect(result.current.isLoading).toBe(false);

      // retry
      act(() => {
        result.current.retry();
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("エッジケース: コールバック未指定", () => {
    it("onScrollChangeが未指定でもスクロール時にエラーにならない", () => {
      renderHook(() => useArticleWebView({ url: "https://example.com" }));

      expect(() => {
        act(() => {
          dispatchScrollMessage(50);
        });
      }).not.toThrow();
    });

    it("onScrollEndが未指定でも90%到達時にエラーにならない", () => {
      renderHook(() => useArticleWebView({ url: "https://example.com" }));

      expect(() => {
        act(() => {
          dispatchScrollMessage(90);
        });
      }).not.toThrow();
    });
  });

  describe("エッジケース: 境界値", () => {
    it("スクロール率が負値の場合0として扱われる", () => {
      const onScrollChange = vi.fn();
      const { result } = renderHook(() =>
        useArticleWebView({
          url: "https://example.com",
          onScrollChange,
        })
      );

      act(() => {
        dispatchScrollMessage(-10);
      });

      expect(result.current.scrollPercentage).toBe(0);
      expect(onScrollChange).toHaveBeenCalledWith(0);
    });

    it("スクロール率が100を超えた場合100として扱われる", () => {
      const onScrollChange = vi.fn();
      const { result } = renderHook(() =>
        useArticleWebView({
          url: "https://example.com",
          onScrollChange,
        })
      );

      act(() => {
        dispatchScrollMessage(110);
      });

      expect(result.current.scrollPercentage).toBe(100);
      expect(onScrollChange).toHaveBeenCalledWith(100);
    });
  });

  describe("エッジケース: リソース解放", () => {
    it("コンポーネントアンマウント時にpostMessageリスナーが解除される", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
      const { unmount } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("message", expect.any(Function));
    });
  });

  describe("コンテンツ高さ（resize メッセージ）", () => {
    it("初期状態でcontentHeightがnullである", () => {
      const { result } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      expect(result.current.contentHeight).toBeNull();
    });

    it("resizeメッセージ受信でcontentHeightが更新される", () => {
      const { result } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: VALID_ORIGIN,
            data: { type: "resize", height: 2500 },
          })
        );
      });

      expect(result.current.contentHeight).toBe(2500);
    });

    it("同一オリジンからのresizeメッセージも処理される", () => {
      const { result } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: window.location.origin,
            data: { type: "resize", height: 3000 },
          })
        );
      });

      expect(result.current.contentHeight).toBe(3000);
    });

    it("不正なoriginからのresizeメッセージは無視される", () => {
      const { result } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: "https://malicious-site.com",
            data: { type: "resize", height: 9999 },
          })
        );
      });

      expect(result.current.contentHeight).toBeNull();
    });

    it("URL変更時にcontentHeightがnullにリセットされる", () => {
      const { result, rerender } = renderHook(({ url }) => useArticleWebView({ url }), {
        initialProps: { url: "https://example.com/article1" },
      });

      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: VALID_ORIGIN,
            data: { type: "resize", height: 2000 },
          })
        );
      });

      expect(result.current.contentHeight).toBe(2000);

      rerender({ url: "https://example.com/article2" });

      expect(result.current.contentHeight).toBeNull();
    });

    it("retry時にcontentHeightがnullにリセットされる", () => {
      const { result } = renderHook(() => useArticleWebView({ url: "https://example.com" }));

      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: VALID_ORIGIN,
            data: { type: "resize", height: 1500 },
          })
        );
      });

      expect(result.current.contentHeight).toBe(1500);

      act(() => {
        result.current.retry();
      });

      expect(result.current.contentHeight).toBeNull();
    });
  });

  describe("同一オリジン（wiki-proxy経由）からのメッセージ", () => {
    it("同一オリジンからのスクロールメッセージが処理される", () => {
      const onScrollChange = vi.fn();
      renderHook(() =>
        useArticleWebView({
          url: "https://example.com",
          onScrollChange,
        })
      );

      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: window.location.origin,
            data: { type: "scroll", percentage: 60 },
          })
        );
      });

      expect(onScrollChange).toHaveBeenCalledWith(60);
    });

    it("同一オリジンからのスクロール90%で読了判定される", () => {
      const onScrollEnd = vi.fn();
      renderHook(() =>
        useArticleWebView({
          url: "https://example.com",
          onScrollEnd,
        })
      );

      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: window.location.origin,
            data: { type: "scroll", percentage: 95 },
          })
        );
      });

      expect(onScrollEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe("エッジケース: 不正なメッセージ", () => {
    it("typeがscroll以外のメッセージは無視される", () => {
      const onScrollChange = vi.fn();
      renderHook(() =>
        useArticleWebView({
          url: "https://example.com",
          onScrollChange,
        })
      );

      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: VALID_ORIGIN,
            data: { type: "other", percentage: 50 },
          })
        );
      });

      expect(onScrollChange).not.toHaveBeenCalled();
    });

    it("percentageがundefinedのメッセージは無視される", () => {
      const onScrollChange = vi.fn();
      renderHook(() =>
        useArticleWebView({
          url: "https://example.com",
          onScrollChange,
        })
      );

      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: VALID_ORIGIN,
            data: { type: "scroll" },
          })
        );
      });

      expect(onScrollChange).not.toHaveBeenCalled();
    });

    it("不正なoriginからのメッセージは無視される", () => {
      const onScrollChange = vi.fn();
      renderHook(() =>
        useArticleWebView({
          url: "https://example.com",
          onScrollChange,
        })
      );

      act(() => {
        dispatchScrollMessageWithInvalidOrigin(50);
      });

      expect(onScrollChange).not.toHaveBeenCalled();
    });
  });
});
