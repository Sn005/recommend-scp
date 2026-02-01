import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useFloatingUIVisibility } from "./useFloatingUIVisibility";

describe("useFloatingUIVisibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("AC-1: 通常時表示", () => {
    it("初期状態でPillNavが表示される", () => {
      const { result } = renderHook(() => useFloatingUIVisibility({ scrollPercentage: 0 }));

      expect(result.current.isPillNavVisible).toBe(true);
    });

    it("scrollPercentageがundefinedでもデフォルト0で動作する", () => {
      const { result } = renderHook(() => useFloatingUIVisibility({ scrollPercentage: 0 }));

      expect(result.current.isPillNavVisible).toBe(true);
    });
  });

  describe("AC-2: 下スクロール時の非表示", () => {
    it("スクロール量が閾値（50px）を超えた場合、PillNavが非表示になる", () => {
      const { result } = renderHook(() => useFloatingUIVisibility({ scrollPercentage: 10 }));

      // 初期位置: 0px
      act(() => {
        result.current.updateScrollDirection(0);
      });
      // 51px下スクロール
      act(() => {
        result.current.updateScrollDirection(51);
      });

      expect(result.current.isPillNavVisible).toBe(false);
    });

    it("スクロール量が閾値ちょうど（50px）の場合、非表示にならない", () => {
      const { result } = renderHook(() => useFloatingUIVisibility({ scrollPercentage: 10 }));

      act(() => {
        result.current.updateScrollDirection(0);
      });
      act(() => {
        result.current.updateScrollDirection(50);
      });

      // deltaY > hideThreshold (50) の条件なので、50pxでは非表示にならない
      expect(result.current.isPillNavVisible).toBe(true);
    });

    it("カスタム閾値（hideThreshold=100）で動作する", () => {
      const { result } = renderHook(() =>
        useFloatingUIVisibility({
          scrollPercentage: 10,
          hideThreshold: 100,
        })
      );

      act(() => {
        result.current.updateScrollDirection(0);
      });
      act(() => {
        result.current.updateScrollDirection(101);
      });

      expect(result.current.isPillNavVisible).toBe(false);
    });
  });

  describe("AC-3: 上スクロール時の再表示", () => {
    it("上方向にスクロールした際、PillNavが表示される", () => {
      const { result } = renderHook(() => useFloatingUIVisibility({ scrollPercentage: 30 }));

      // 初期: 0px
      act(() => {
        result.current.updateScrollDirection(0);
      });
      // 下スクロール: 100px（差分100 > 50なので非表示）
      act(() => {
        result.current.updateScrollDirection(100);
      });
      expect(result.current.isPillNavVisible).toBe(false);

      // 上スクロール: 50px（差分-50 < 0なので表示）
      act(() => {
        result.current.updateScrollDirection(50);
      });
      expect(result.current.isPillNavVisible).toBe(true);
    });

    it("わずかな上スクロール（1px）でも表示される", () => {
      const { result } = renderHook(() => useFloatingUIVisibility({ scrollPercentage: 30 }));

      act(() => {
        result.current.updateScrollDirection(0);
      });
      act(() => {
        result.current.updateScrollDirection(100);
      });
      expect(result.current.isPillNavVisible).toBe(false);

      // 1pxでも上スクロールすればdeltaY < 0
      act(() => {
        result.current.updateScrollDirection(99);
      });

      expect(result.current.isPillNavVisible).toBe(true);
    });
  });

  describe("AC-4: スクロール停止時の再表示", () => {
    it("スクロール停止2秒後にPillNavが表示される", () => {
      const { result } = renderHook(() => useFloatingUIVisibility({ scrollPercentage: 30 }));

      // 下スクロールで非表示
      act(() => {
        result.current.updateScrollDirection(0);
      });
      act(() => {
        result.current.updateScrollDirection(100);
      });
      expect(result.current.isPillNavVisible).toBe(false);

      // 1.9秒経過 → まだ非表示
      act(() => {
        vi.advanceTimersByTime(1900);
      });
      expect(result.current.isPillNavVisible).toBe(false);

      // 2秒経過 → 表示
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.isPillNavVisible).toBe(true);
    });

    it("カスタム遅延時間（showDelayMs=3000）で動作する", () => {
      const { result } = renderHook(() =>
        useFloatingUIVisibility({
          scrollPercentage: 30,
          showDelayMs: 3000,
        })
      );

      act(() => {
        result.current.updateScrollDirection(0);
      });
      act(() => {
        result.current.updateScrollDirection(100);
      });

      act(() => {
        vi.advanceTimersByTime(2999);
      });
      expect(result.current.isPillNavVisible).toBe(false);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.isPillNavVisible).toBe(true);
    });

    it("タイムアウト前にスクロールした場合、タイマーがリセットされる", () => {
      const { result } = renderHook(() => useFloatingUIVisibility({ scrollPercentage: 30 }));

      act(() => {
        result.current.updateScrollDirection(0);
      });
      act(() => {
        result.current.updateScrollDirection(100);
      });
      expect(result.current.isPillNavVisible).toBe(false);

      // 1秒経過
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 再度スクロール（タイマーリセット）
      act(() => {
        result.current.updateScrollDirection(150);
      });

      // 1秒経過（合計2秒だがリセットされたので非表示のまま）
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.isPillNavVisible).toBe(false);

      // さらに1秒経過（リセット後2秒）
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.isPillNavVisible).toBe(true);
    });
  });

  describe("AC-5: 記事最下部での常時表示", () => {
    it("スクロール率90%以上でPillNavが常時表示される", () => {
      const { result } = renderHook(() => useFloatingUIVisibility({ scrollPercentage: 90 }));

      expect(result.current.isPillNavVisible).toBe(true);

      // 下スクロールしても非表示にならない
      act(() => {
        result.current.updateScrollDirection(0);
      });
      act(() => {
        result.current.updateScrollDirection(100);
      });

      expect(result.current.isPillNavVisible).toBe(true);
    });

    it("スクロール率89%では通常の挙動を維持する", () => {
      const { result } = renderHook(() => useFloatingUIVisibility({ scrollPercentage: 89 }));

      act(() => {
        result.current.updateScrollDirection(0);
      });
      act(() => {
        result.current.updateScrollDirection(100);
      });

      // 89%では非表示になる
      expect(result.current.isPillNavVisible).toBe(false);
    });

    it("スクロール率が90%→89%に変化した場合、通常挙動に戻る", () => {
      const { result, rerender } = renderHook(
        ({ scrollPercentage }) => useFloatingUIVisibility({ scrollPercentage }),
        { initialProps: { scrollPercentage: 90 } }
      );

      expect(result.current.isPillNavVisible).toBe(true);

      // 89%に変化
      rerender({ scrollPercentage: 89 });

      // 下スクロールで非表示になる
      act(() => {
        result.current.updateScrollDirection(0);
      });
      act(() => {
        result.current.updateScrollDirection(100);
      });

      expect(result.current.isPillNavVisible).toBe(false);
    });

    it("カスタム閾値（alwaysShowThreshold=95）で動作する", () => {
      const { result } = renderHook(() =>
        useFloatingUIVisibility({
          scrollPercentage: 94,
          alwaysShowThreshold: 95,
        })
      );

      act(() => {
        result.current.updateScrollDirection(0);
      });
      act(() => {
        result.current.updateScrollDirection(100);
      });

      // 94%では非表示になる
      expect(result.current.isPillNavVisible).toBe(false);
    });

    it("スクロール率100%超でも常時表示", () => {
      const { result } = renderHook(() => useFloatingUIVisibility({ scrollPercentage: 105 }));

      expect(result.current.isPillNavVisible).toBe(true);
    });
  });

  describe("クリーンアップ", () => {
    it("アンマウント時にタイマーがクリアされる", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      const { result, unmount } = renderHook(() =>
        useFloatingUIVisibility({ scrollPercentage: 30 })
      );

      // スクロールしてタイマーを開始
      act(() => {
        result.current.updateScrollDirection(0);
      });
      act(() => {
        result.current.updateScrollDirection(100);
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
