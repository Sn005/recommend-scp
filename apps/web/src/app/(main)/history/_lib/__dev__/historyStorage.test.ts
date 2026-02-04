/**
 * @file historyStorage テスト
 * @description 履歴のlocalStorage操作のテスト
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { addHistory, getHistory, clearHistory, STORAGE_KEY } from "../historyStorage";
import type { HistoryEntry } from "../../_types";

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

describe("historyStorage", () => {
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

  describe("addHistory", () => {
    it("履歴エントリを追加できる", () => {
      const entry = {
        scpNumber: "scp-173",
        title: "彫刻 - オリジナル",
        excerpt: "アイテム番号: SCP-173 オブジェクトクラス: Euclid",
        objectClass: "Euclid" as const,
      };

      const result = addHistory(entry);

      expect(result.scpNumber).toBe("scp-173");
      expect(result.title).toBe("彫刻 - オリジナル");
      expect(result.excerpt).toBe("アイテム番号: SCP-173 オブジェクトクラス: Euclid");
      expect(result.objectClass).toBe("Euclid");
      expect(result.viewedAt).toBe("2024-01-15T10:00:00.000Z");
    });

    it("excerptが保存される（AC-2）", () => {
      const entry = {
        scpNumber: "scp-173",
        title: "彫刻",
        excerpt: "本文冒頭テキスト",
        objectClass: "Safe" as const,
      };

      addHistory(entry);

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored as string) as HistoryEntry[];
      expect(parsed[0].excerpt).toBe("本文冒頭テキスト");
    });

    it("excerptが未指定の場合は空文字になる", () => {
      const entry = {
        scpNumber: "scp-173",
        title: "彫刻",
        objectClass: "Safe" as const,
      };

      const result = addHistory(entry as Parameters<typeof addHistory>[0]);

      expect(result.excerpt).toBe("");
    });

    it("同じSCP番号の履歴は更新される（重複排除）", () => {
      addHistory({
        scpNumber: "scp-173",
        title: "彫刻",
        excerpt: "古いexcerpt",
        objectClass: "Safe" as const,
      });

      vi.setSystemTime(new Date("2024-01-15T11:00:00.000Z"));

      addHistory({
        scpNumber: "scp-173",
        title: "彫刻 - オリジナル",
        excerpt: "新しいexcerpt",
        objectClass: "Euclid" as const,
      });

      const history = getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe("彫刻 - オリジナル");
      expect(history[0].excerpt).toBe("新しいexcerpt");
      expect(history[0].viewedAt).toBe("2024-01-15T11:00:00.000Z");
    });
  });

  describe("getHistory", () => {
    it("空の場合は空配列を返す", () => {
      const history = getHistory();
      expect(history).toEqual([]);
    });

    it("保存された履歴を取得できる", () => {
      addHistory({
        scpNumber: "scp-173",
        title: "彫刻",
        excerpt: "テスト",
        objectClass: "Euclid" as const,
      });

      const history = getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].scpNumber).toBe("scp-173");
    });

    it("後方互換性: excerptがないデータでもエラーにならない（AC-3）", () => {
      // 古い形式のデータ（excerptなし）を直接localStorageに書き込む
      const oldData = [
        {
          scpNumber: "scp-173",
          title: "彫刻",
          objectClass: "Euclid",
          viewedAt: "2024-01-15T10:00:00.000Z",
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(oldData));

      const history = getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].excerpt).toBe(""); // 空文字がデフォルト
      expect(history[0].scpNumber).toBe("scp-173");
    });

    it("不正なJSONでも空配列を返す", () => {
      localStorage.setItem(STORAGE_KEY, "invalid json");

      const history = getHistory();
      expect(history).toEqual([]);
    });

    it("新しい順（viewedAt降順）でソートされる", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          {
            scpNumber: "scp-001",
            title: "古い",
            excerpt: "",
            objectClass: "Safe",
            viewedAt: "2024-01-14T10:00:00.000Z",
          },
          {
            scpNumber: "scp-002",
            title: "新しい",
            excerpt: "",
            objectClass: "Keter",
            viewedAt: "2024-01-15T10:00:00.000Z",
          },
        ])
      );

      const history = getHistory();
      expect(history[0].scpNumber).toBe("scp-002");
      expect(history[1].scpNumber).toBe("scp-001");
    });
  });

  describe("clearHistory", () => {
    it("履歴を全て削除できる", () => {
      addHistory({
        scpNumber: "scp-173",
        title: "彫刻",
        excerpt: "テスト",
        objectClass: "Euclid" as const,
      });

      clearHistory();

      expect(getHistory()).toEqual([]);
    });
  });
});
