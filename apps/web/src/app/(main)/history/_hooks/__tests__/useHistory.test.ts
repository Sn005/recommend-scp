/**
 * @file useHistory テスト
 * @description 閲覧履歴管理フックのテスト
 * @see specs/006-frontend/006-04-history/006-04-01.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHistory } from "../useHistory";
import { STORAGE_KEY } from "../../_lib/historyStorage";

// データを保持するlocalStorageモック
function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      const { [key]: _, ...rest } = store;
      void _;
      store = rest;
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

describe("useHistory", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("history（履歴配列）を取得できる（AC-5）", () => {
    const { result } = renderHook(() => useHistory());

    expect(result.current.history).toBeDefined();
    expect(Array.isArray(result.current.history)).toBe(true);
  });

  it("add関数で履歴を追加できる（AC-5）", () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.add({
        scpNumber: "scp-173",
        title: "彫刻 - オリジナル",
        excerpt: "テスト",
        objectClass: "Euclid",
      });
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].scpNumber).toBe("scp-173");
  });

  it("clear関数で履歴を全削除できる（AC-5）", () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.add({
        scpNumber: "scp-173",
        title: "彫刻 - オリジナル",
        excerpt: "テスト",
        objectClass: "Euclid",
      });
    });

    expect(result.current.history).toHaveLength(1);

    act(() => {
      result.current.clear();
    });

    expect(result.current.history).toHaveLength(0);
  });

  it("初期表示時にlocalStorageから履歴を読み込む（AC-4）", () => {
    const entries = [
      {
        scpNumber: "scp-173",
        title: "彫刻 - オリジナル",
        excerpt: "テスト",
        objectClass: "Euclid",
        viewedAt: "2024-01-15T10:00:00.000Z",
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    const { result } = renderHook(() => useHistory());

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].scpNumber).toBe("scp-173");
  });

  it("同じSCP番号で追加すると重複しない（AC-2）", () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.add({
        scpNumber: "scp-173",
        title: "彫刻",
        excerpt: "古い",
        objectClass: "Safe",
      });
    });

    vi.setSystemTime(new Date("2024-01-15T11:00:00.000Z"));

    act(() => {
      result.current.add({
        scpNumber: "scp-173",
        title: "彫刻 - オリジナル",
        excerpt: "新しい",
        objectClass: "Euclid",
      });
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].title).toBe("彫刻 - オリジナル");
  });

  it("refresh関数で履歴を再読み込みできる", () => {
    const { result } = renderHook(() => useHistory());

    // 直接localStorageに書き込む（他タブからの変更をシミュレート）
    const entries = [
      {
        scpNumber: "scp-999",
        title: "くすぐりおばけ",
        excerpt: "テスト",
        objectClass: "Safe",
        viewedAt: "2024-01-15T10:00:00.000Z",
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

    act(() => {
      result.current.refresh();
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].scpNumber).toBe("scp-999");
  });

  it("100件を超えると古いエントリが削除される（AC-3）", () => {
    const { result } = renderHook(() => useHistory());
    const baseDate = new Date("2024-01-01T00:00:00.000Z");

    act(() => {
      for (let i = 1; i <= 101; i++) {
        const date = new Date(baseDate.getTime() + i * 60000); // 1分ずつ増加
        vi.setSystemTime(date);
        result.current.add({
          scpNumber: `scp-${String(i)}`,
          title: `タイトル ${String(i)}`,
          excerpt: `excerpt ${String(i)}`,
          objectClass: "Safe",
        });
      }
    });

    expect(result.current.history).toHaveLength(100);
    expect(result.current.history[0].scpNumber).toBe("scp-101");
  });

  it("clearを複数回呼び出してもエラーにならない", () => {
    const { result } = renderHook(() => useHistory());

    act(() => {
      result.current.clear();
      result.current.clear();
      result.current.clear();
    });

    expect(result.current.history).toHaveLength(0);
  });
});
