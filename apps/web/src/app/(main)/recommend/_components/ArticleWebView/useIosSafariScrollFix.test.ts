/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIosSafariScrollFix } from "./useIosSafariScrollFix";
import type { RefObject } from "react";

/**
 * コンテナRefのモック生成
 */
function createMockContainerRef(): RefObject<HTMLDivElement | null> {
  const element = {
    style: { height: "", width: "" },
  } as unknown as HTMLDivElement;
  return { current: element };
}

/**
 * iframeRefのモック生成（contentWindow付き）
 */
function createMockIframeRef(options?: { crossOrigin?: boolean }) {
  const listeners = new Map<string, EventListener>();
  const contentWindow = {
    scrollTo: vi.fn(),
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      listeners.set(event, handler);
    }),
    removeEventListener: vi.fn((event: string) => {
      listeners.delete(event);
    }),
  };

  const element = options?.crossOrigin
    ? ({
        get contentWindow(): never {
          throw new DOMException("cross-origin");
        },
        style: { width: "" },
      } as unknown as HTMLIFrameElement)
    : ({
        contentWindow,
        style: { width: "" },
      } as unknown as HTMLIFrameElement);

  const ref: RefObject<HTMLIFrameElement | null> = { current: element };

  return { ref, contentWindow, listeners };
}

describe("useIosSafariScrollFix", () => {
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** rAFキューを全て実行 */
  function flushRaf() {
    while (rafCallbacks.length > 0) {
      const cbs = [...rafCallbacks];
      rafCallbacks = [];
      cbs.forEach((cb) => {
        cb(0);
      });
    }
  }

  describe("表示昇格時のリフロー", () => {
    it("isVisible=falseからtrueに変化した時にコンテナのheightトグルが実行される", () => {
      const containerRef = createMockContainerRef();
      const { ref: iframeRef } = createMockIframeRef();

      const { rerender } = renderHook(
        ({ isVisible }) => {
          useIosSafariScrollFix({ isVisible, containerRef, iframeRef });
        },
        { initialProps: { isVisible: false } }
      );

      rerender({ isVisible: true });

      // heightが"auto"にセットされている
      expect(containerRef.current!.style.height).toBe("auto");

      // rAFを2回フラッシュして復元
      flushRaf();
      expect(containerRef.current!.style.height).toBe("");
    });

    it("isVisible=falseからtrueに変化した時にiframeのwidthが微小変更→復元される", () => {
      const containerRef = createMockContainerRef();
      const { ref: iframeRef } = createMockIframeRef();

      const { rerender } = renderHook(
        ({ isVisible }) => {
          useIosSafariScrollFix({ isVisible, containerRef, iframeRef });
        },
        { initialProps: { isVisible: false } }
      );

      rerender({ isVisible: true });
      flushRaf();

      // width復元後は""に戻る
      expect((iframeRef.current! as unknown as { style: CSSStyleDeclaration }).style.width).toBe(
        ""
      );
    });

    it("isVisible=falseからtrueに変化した時にcontentWindow.scrollTo(0,0)が呼ばれる", () => {
      const containerRef = createMockContainerRef();
      const { ref: iframeRef, contentWindow } = createMockIframeRef();

      const { rerender } = renderHook(
        ({ isVisible }) => {
          useIosSafariScrollFix({ isVisible, containerRef, iframeRef });
        },
        { initialProps: { isVisible: false } }
      );

      rerender({ isVisible: true });
      flushRaf();

      expect(contentWindow.scrollTo).toHaveBeenCalledWith(0, 0);
    });

    it("isVisible=trueのままrerenderしてもリフローは実行されない", () => {
      const containerRef = createMockContainerRef();
      const { ref: iframeRef, contentWindow } = createMockIframeRef();

      const { rerender } = renderHook(
        ({ isVisible }) => {
          useIosSafariScrollFix({ isVisible, containerRef, iframeRef });
        },
        { initialProps: { isVisible: true } }
      );

      // 初回rAFを消化
      flushRaf();
      contentWindow.scrollTo.mockClear();

      rerender({ isVisible: true });
      flushRaf();

      // 2回目のrerenderではscrollToが呼ばれない
      expect(contentWindow.scrollTo).not.toHaveBeenCalled();
    });

    it("cross-originのiframeでもエラーにならない", () => {
      const containerRef = createMockContainerRef();
      const { ref: iframeRef } = createMockIframeRef({ crossOrigin: true });

      expect(() => {
        renderHook(() => {
          useIosSafariScrollFix({
            isVisible: true,
            containerRef,
            iframeRef,
          });
        });
      }).not.toThrow();
    });
  });

  describe("初回タッチフォールバック", () => {
    it("isVisible=trueの時にtouchstartリスナーが登録される", () => {
      const containerRef = createMockContainerRef();
      const { ref: iframeRef, contentWindow } = createMockIframeRef();

      renderHook(() => {
        useIosSafariScrollFix({
          isVisible: true,
          containerRef,
          iframeRef,
        });
      });

      expect(contentWindow.addEventListener).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
        { once: true, passive: true }
      );
    });

    it("isVisible=falseの時にtouchstartリスナーが登録されない", () => {
      const containerRef = createMockContainerRef();
      const { ref: iframeRef, contentWindow } = createMockIframeRef();

      renderHook(() => {
        useIosSafariScrollFix({
          isVisible: false,
          containerRef,
          iframeRef,
        });
      });

      expect(contentWindow.addEventListener).not.toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function),
        expect.anything()
      );
    });

    it("touchstart発火時にコンテナのheightトグルが実行される", () => {
      const containerRef = createMockContainerRef();
      const { ref: iframeRef, listeners } = createMockIframeRef();

      renderHook(() => {
        useIosSafariScrollFix({
          isVisible: true,
          containerRef,
          iframeRef,
        });
      });

      // touchstartハンドラーを取得して呼び出し
      const touchHandler = listeners.get("touchstart");
      expect(touchHandler).toBeDefined();

      act(() => {
        touchHandler!(new Event("touchstart"));
      });

      expect(containerRef.current!.style.height).toBe("auto");
      flushRaf();
      expect(containerRef.current!.style.height).toBe("");
    });

    it("アンマウント時にtouchstartリスナーが解除される", () => {
      const containerRef = createMockContainerRef();
      const { ref: iframeRef, contentWindow } = createMockIframeRef();

      const { unmount } = renderHook(() => {
        useIosSafariScrollFix({
          isVisible: true,
          containerRef,
          iframeRef,
        });
      });

      unmount();

      expect(contentWindow.removeEventListener).toHaveBeenCalledWith(
        "touchstart",
        expect.any(Function)
      );
    });
  });

  describe("Ref未設定時の安全性", () => {
    it("containerRef.current=nullでもエラーにならない", () => {
      const containerRef: RefObject<HTMLDivElement | null> = { current: null };
      const { ref: iframeRef } = createMockIframeRef();

      expect(() => {
        renderHook(() => {
          useIosSafariScrollFix({
            isVisible: true,
            containerRef,
            iframeRef,
          });
        });
      }).not.toThrow();
    });

    it("iframeRef.current=nullでもエラーにならない", () => {
      const containerRef = createMockContainerRef();
      const iframeRef: RefObject<HTMLIFrameElement | null> = { current: null };

      expect(() => {
        renderHook(() => {
          useIosSafariScrollFix({
            isVisible: true,
            containerRef,
            iframeRef,
          });
        });
      }).not.toThrow();
    });
  });
});
